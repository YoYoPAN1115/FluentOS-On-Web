param(
    [switch]$SkipManifestCheck,
    [switch]$SkipJavaScriptSyntax
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$rootUri = [Uri]::new(($root.TrimEnd('\') + '\'))
$errors = [Collections.Generic.List[string]]::new()
$warnings = [Collections.Generic.List[string]]::new()

function Add-ValidationError([string]$Message) {
    $script:errors.Add($Message)
}

function Get-RelativePath([IO.FileSystemInfo]$Item) {
    [Uri]::UnescapeDataString($rootUri.MakeRelativeUri([Uri]::new($Item.FullName)).ToString())
}

function Normalize-RelativePath([string]$Path) {
    $value = [Uri]::UnescapeDataString(($Path -split '[?#]', 2)[0]).Replace('\', '/').Trim()
    while ($value.StartsWith('./')) { $value = $value.Substring(2) }
    while ($value.StartsWith('../')) { $value = $value.Substring(3) }
    $value.TrimStart('/')
}

function Test-RepositoryFile([string]$Path, [string]$Source) {
    if (-not $Path -or $Path -match '^(?:[a-z]+:)?//' -or $Path -match '^(?:data|blob):') { return }
    $relative = Normalize-RelativePath $Path
    if (-not $relative) { return }
    $absolute = Join-Path $root ($relative.Replace('/', [IO.Path]::DirectorySeparatorChar))
    if (-not (Test-Path -LiteralPath $absolute -PathType Leaf)) {
        Add-ValidationError "Missing local file '$relative' referenced by $Source."
    }
}

$indexPath = Join-Path $root 'index.html'
$index = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8

$scriptEntries = [regex]::Matches($index, '<script\b[^>]*\bsrc\s*=\s*["'']([^"'']+)["'']', 'IgnoreCase') |
    ForEach-Object { Normalize-RelativePath $_.Groups[1].Value }
$styleEntries = [regex]::Matches($index, '<link\b[^>]*\brel\s*=\s*["'']stylesheet["''][^>]*\bhref\s*=\s*["'']([^"'']+)["'']', 'IgnoreCase') |
    ForEach-Object { Normalize-RelativePath $_.Groups[1].Value }

foreach ($entry in @($scriptEntries) + @($styleEntries)) {
    Test-RepositoryFile $entry 'index.html'
}
foreach ($duplicate in (@($scriptEntries) + @($styleEntries) | Group-Object | Where-Object Count -gt 1)) {
    Add-ValidationError "Duplicate entry in index.html: $($duplicate.Name)"
}

$ids = [regex]::Matches($index, '\bid\s*=\s*["'']([^"'']+)["'']', 'IgnoreCase') |
    ForEach-Object { $_.Groups[1].Value }
foreach ($duplicate in ($ids | Group-Object | Where-Object Count -gt 1)) {
    Add-ValidationError "Duplicate HTML id '$($duplicate.Name)' appears $($duplicate.Count) times."
}

$allJavaScript = Get-ChildItem -LiteralPath (Join-Path $root 'js') -File -Filter '*.js' -Recurse |
    ForEach-Object { Get-RelativePath $_ }
$allCss = Get-ChildItem -LiteralPath (Join-Path $root 'css') -File -Filter '*.css' -Recurse |
    ForEach-Object { Get-RelativePath $_ }
$scriptEntrySet = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$styleEntrySet = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($entry in $scriptEntries) { [void]$scriptEntrySet.Add($entry) }
foreach ($entry in $styleEntries) { [void]$styleEntrySet.Add($entry) }
foreach ($file in $allJavaScript) {
    if (-not $scriptEntrySet.Contains($file)) {
        Add-ValidationError "JavaScript file has no runtime entry: $file"
    }
}
foreach ($file in $allCss) {
    if (-not $styleEntrySet.Contains($file)) {
        Add-ValidationError "CSS file has no runtime entry: $file"
    }
}

$activeSources = @((Get-Item -LiteralPath $indexPath))
$activeSources += Get-ChildItem -LiteralPath (Join-Path $root 'js') -File -Filter '*.js' -Recurse |
    Where-Object Name -notin @('resource-manifest.js', 'storage-manifest.js')
$activeSources += Get-ChildItem -LiteralPath (Join-Path $root 'css') -File -Filter '*.css' -Recurse
$assetPattern = '(?<![A-Za-z0-9])(?:\.\./)?(Theme/[A-Za-z0-9_./ -]+\.(?:png|jpe?g|svg|webp|gif|ico))'
$legacyAssetAliases = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($alias in @('Theme/Icon/userava.png', 'Theme/Profile_img/userava.png')) {
    [void]$legacyAssetAliases.Add($alias)
}
foreach ($source in $activeSources) {
    $text = Get-Content -LiteralPath $source.FullName -Raw -Encoding UTF8
    foreach ($match in [regex]::Matches($text, $assetPattern, 'IgnoreCase')) {
        $assetPath = $match.Groups[1].Value
        # These strings are accepted only as migration aliases for old persisted profiles.
        if ($legacyAssetAliases.Contains($assetPath)) { continue }
        Test-RepositoryFile $assetPath (Get-RelativePath $source)
    }
}

foreach ($catalogPath in @('js/third_parts_apps/pwa-catalog.js', 'js/apps/appshop.js')) {
    $absolute = Join-Path $root $catalogPath
    $text = Get-Content -LiteralPath $absolute -Raw -Encoding UTF8
    foreach ($match in [regex]::Matches($text, '\bicon\s*:\s*["'']([^"'']+)["'']')) {
        $icon = $match.Groups[1].Value
        if ($icon -match '^(?:data|blob|https?):') { continue }
        # Extensionless values are Fluent UI glyph names, not image assets.
        if ($icon -notmatch '\.(?:png|jpe?g|svg|webp|gif|ico)$') { continue }
        $path = if ($icon.Contains('/')) { $icon } else { "Theme/Icon/App_icon/$icon" }
        Test-RepositoryFile $path $catalogPath
    }
}

if (-not $SkipManifestCheck) {
    foreach ($generator in @('generate-resource-manifest.ps1', 'generate-storage-manifest.ps1')) {
        try {
            & (Join-Path $PSScriptRoot $generator) -Check | ForEach-Object { Write-Host $_ }
        } catch {
            Add-ValidationError $_.Exception.Message
        }
    }
}

if (-not $SkipJavaScriptSyntax) {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node) {
        foreach ($file in (Get-ChildItem -LiteralPath (Join-Path $root 'js') -File -Filter '*.js' -Recurse)) {
            & $node.Source --check $file.FullName 2>$null
            if ($LASTEXITCODE -ne 0) {
                Add-ValidationError "JavaScript syntax check failed: $(Get-RelativePath $file)"
            }
        }
    } else {
        $warnings.Add('Node.js is unavailable; JavaScript syntax checking was skipped.')
    }
}

foreach ($warning in $warnings) { Write-Warning $warning }
if ($errors.Count -gt 0) {
    Write-Host "Project validation failed with $($errors.Count) error(s):" -ForegroundColor Red
    foreach ($message in $errors) { Write-Host "  - $message" -ForegroundColor Red }
    exit 1
}

Write-Host "Project validation passed: $($allJavaScript.Count) JavaScript files, $($allCss.Count) stylesheets, $($ids.Count) HTML ids." -ForegroundColor Green
