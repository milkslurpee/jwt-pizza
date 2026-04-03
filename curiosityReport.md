# Environment-Dependent Configuration Selection

Configuration management across multiple environments is a fundamental challenge in DevOps. The core problem is straightforward: software often needs to behave differently depending on where it's running, but manually managing those differences is error-prone and doesn't scale. Tools like Ansible, Docker, and GitHub Environments all exist largely to solve this problem. This report documents a small-scale version of that same challenge — getting a video game to automatically select the correct configuration based on which display environment it's running on — and the scripted solution I built to solve it.

## Background

So, I've had this problem. There's a video game called Fallout New Vegas (FalloutNV) that I absolutely love to play. However, FalloutNV is a pretty old game and it is held together with spit and tape. Now, the problem is that I like to play video games across a wide range of screens with different aspect ratios. I have an ultrawide 21:9 desktop that I use when I'm at my desk, and a 16:9 TV that I use when I want to play on the couch. I also gamestream from my desktop to both my phone, where I use a weird nonstandard aspect ratio, and my MacBook Air, which is 16:10. So, that is 4 different aspect ratios that I like to play games on. Most games can handle that without causing too much of a headache, but not FalloutNV; that game does NOT like anything other than standard 16:9 or, since it's a bit older, classic 4:3. It breaks a ton of the visuals.

## Research

As I sought to solve this problem, I found that FalloutNV has some configuration files that you can customize to pretty easily solve a lot of the issues with any one specific aspect ratio. However, I would have to edit these config files every time I wanted to switch between different screens.

## Experiment

My experiment was to automate the process of changing those configurations. The plan was to replace my shortcut to the game on my desktop with a script that would somehow determine the environment (which screen) the game is running on, and then select the correct configuration files for that environment. I'll have the steps below for my FalloutNV specifically, but this same concept should work for any software that uses user-defined ini files. The steps are for Windows 11 computers.

### Steps

1. Find the `Fallout.ini` and `FalloutPrefs.ini` files. They are usually found inside:
   `C:\Users\USERNAME\Documents\My Games\FalloutNV`

2. Inside the `FalloutNV` folder, create a directory called `Profiles`, and make subdirectories for each environment/screen. For me those were `Default`, `Macbook`, `Phone`, and `Ultrawide`.

3. Copy the `Fallout.ini` and `FalloutPrefs.ini` files into each of those directories you made.

4. Open your code editor and write/paste in this script:
```powershell
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$width = $screen.Bounds.Width
$documentsPath = "C:\Users\johns\Documents\My Games\FalloutNV"
$profilesPath = "$documentsPath\Profiles"
$gameFolder = "E:\SteamLibrary\steamapps\common\Fallout New Vegas"
$gameExe = "$gameFolder\nvse_loader.exe"

$targetFalloutIni = "$documentsPath\Fallout.ini"
$targetPrefsIni = "$documentsPath\FalloutPrefs.ini"

if ($width -eq 3440) {
    $profileFolder = "$profilesPath\Ultrawide"
    $mode = "Ultrawide (3440x1440)"
}
elseif ($width -eq 1301) {
    $profileFolder = "$profilesPath\Phone"
    $mode = "Phone (1626x781)"
}
elseif ($width -eq 1680) {
    $profileFolder = "$profilesPath\Macbook"
    $mode = "MacBook (1680x1050)"
}
elseif ($width -eq 1920) {
    $profileFolder = "$profilesPath\Default"
    $mode = "1080p (1920x1080)"
}
else {
    $count = [System.Windows.Forms.Screen]::AllScreens.Count
    $msg = "Detected width: $width`nNumber of screens: $count`nPrimary device: $($screen.DeviceName)"
    [System.Windows.Forms.MessageBox]::Show($msg, "Unknown Display")
    exit 1
}

$sourceFalloutIni = "$profileFolder\Fallout.ini"
$sourcePrefsIni = "$profileFolder\FalloutPrefs.ini"

if ((Test-Path $sourceFalloutIni) -and (Test-Path $sourcePrefsIni)) {
    Copy-Item -Path $sourceFalloutIni -Destination $targetFalloutIni -Force
    Copy-Item -Path $sourcePrefsIni -Destination $targetPrefsIni -Force
    Write-Host "$mode activated."
} else {
    Write-Host "ERROR: Missing INI files in $profileFolder"
    exit 1
}

Start-Process -FilePath $gameExe -WorkingDirectory $gameFolder
```

5. Save the script as `LaunchFNV.ps1`.

6. Right-click on the Windows desktop and click **New → Shortcut**.

7. For "type the location of the item", enter: powershell.exe -ExecutionPolicy Bypass -File "C:\YOUR\PATH\TO\LaunchFNV.ps1"

8. If desired, change the default PowerShell icon to the FalloutNV icon, or whatever program you will be running.

9. Run the game in your different environments and make changes to the configuration files as you come across problems.

10. For FalloutNV specifically, the changes I ended up making were hardcoding the resolution I wanted for each screen, and then adjusting the field of view. That fixed most everything.

### Configuration Details

#### Resolution

Resolution is set in `FalloutPrefs.ini` under `[Display]`:
```ini
[Display]
iSize H=<vertical resolution>
iSize W=<horizontal resolution>
```

For each environment, put the resolution you want the game to run at.

#### Field of View

FOV issues are fixed in `Fallout.ini` under `[Display]` and `[RenderedTerminal]`:
```ini
[Display]
fDefaultFOV=<FOVvalue>
fPipboy1stPersonFOV=<FOVvalue>
fDefault1stPersonFOV=<FOVvalue>
fWorldFOV=<FOVvalue>

[RenderedTerminal]
fRenderedTerminalZoom=<FOVvalue>
```

## Result

After doing all of this I now have a script that automatically detects what environment I am running the game in, copies in the correct config for that environment, and then launches the game. It feels the same as it did before, only I no longer have a headache and can just enjoy the game. Praise be to automation.