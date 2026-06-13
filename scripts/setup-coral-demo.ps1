$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$DemoData = Join-Path $Root "coral\demo-data"
$Templates = Join-Path $Root "coral\source-specs\demo"
$Generated = Join-Path $Root ".coral\generated"

New-Item -ItemType Directory -Force -Path $Generated | Out-Null

function Convert-ToFileUri([string] $Path) {
  $resolved = (Resolve-Path $Path).Path
  if (-not $resolved.EndsWith("\")) {
    $resolved = "$resolved\"
  }
  return ([System.Uri] $resolved).AbsoluteUri.TrimEnd("/")
}

$dataUri = Convert-ToFileUri $DemoData

Get-ChildItem -Path $Templates -Filter "*.yaml.template" | ForEach-Object {
  $target = Join-Path $Generated ($_.BaseName)
  (Get-Content $_.FullName -Raw).Replace("__DEMO_DATA_URI__", $dataUri) | Set-Content -Path $target -Encoding utf8
  coral source lint $target
  coral source add --file $target
}

Write-Host "Installed HarborMaster demo sources."
Write-Host "Run: `$env:HARBORMASTER_USE_CORAL='1'; npm run dev"
