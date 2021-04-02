# snapdrop-tray
Crossplatform Snapdrop Client with functional Tray Icon, ported with Electron.


Thanks to the electon-team for https://www.electronjs.org/!

Thanks to the Snapdrop-team for https://snapdrop.net/! ([GitHub Repository](https://github.com/RobinLinus/snapdrop))

## Installation:

Take a look at the [releases](https://github.com/toHok-4l/snapdrop/releases).(Linux .deb and Win .exe)

If you want this app on MacOS you can eigth wait till I figured out how to build electron.js for it (that will take some time), or launch the sourcecode. 

Clone this repository, run `npm install electron path mime-types electron-store auto-launch`, move the '/images' folder one directory up (working on a fix) and then run `npm start`.

## How to use it?

Once you started the app (or ran `npm start` on MacOS) you should see a Tray icon on the bottom right (or under `^` on Windows). When right-clicking on it, you should see a Menu constaining:

- __Settings__   >
- __Send Files__ >
- __Send Text__  >
- __Reload__
- __Quit All__

'Quit All' and 'Reload' are pretty self explanatory.

The Submenus 'Send Text' and 'Send Files' should show your Snapdrop-name at the top and all other Snapdrop Devices at the bottom.

The 'Settings' Submenu contains:

- __Launch on startup__ (launches snapdrop-tray on systemstartup/login using npm auto-launch if enabled)
- __Debug__ (Displayes the actuall BrowserWindows and pushes a Start Notification)
- __Auto Download__ (Auto downloads all files received)
- __Set Download Path__ (Showes a Directory selector for choosing a Download Path)
- __Apply__ (applies the setting via reloading)


## Known issues:
- When sending Text messages via the Tray Icon on Linux, the Inputbox has black corners. This is caused by electron not supporting transparent background on linux (yet).
- The TrayIcon is close to invisible on Light Mode machines.

## Add in the Future
- dynamic resizing of the textarea in TextInput.html
- Some sort of Progress Indicator
- feel free to suggest something ...