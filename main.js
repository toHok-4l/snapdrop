const { app, BrowserWindow, Notification, Menu, Tray, ipcMain, dialog, screen, shell } = require('electron'); //electron Modules
const Store = require('electron-store');    //storing data in Electron
const fs = require('fs');                   //acessing local files (for sending files via TrayMenu)
const AutoLaunch = require('auto-launch');  //needed for 'launch on startup';https://electronjs.org/docs/api/app#appsetloginitemsettingssettings-macos-windows is not supported on linux
const path = require('path');               //getting filename from path //may be removed in the future to clean up code (if workaround found)
const mime = require('mime-types');         //getting MIME-type from extention //may be removed in the future to clean up code (if workaround found)
//END


//global variableslet 
var ClientName = 'The eaiest way to transfer data across devices';   //as long as no name is set, display this
var ClearName = null        //Clientname without sentences, just the name //may be removed in the future to clean up code (if workaround found)
const store = new Store();  //for storeing data after app ic closed
var contextMenu = null;     //Menu of the Tray icon
var win = null;             //the \'Snapdrop\' window
var tray = null             //the tray icon itself
var peers = [];             //Array of all current peers
var txt = null;             //The \'text input\' window
//END


//Listeners for Manageing Clients
ipcMain.on('sendName', (event, newClientName) => {            //triggerd in ui.js
  ClientName = 'You are known as \'' + newClientName + '\'';
  ClearName = newClientName;
  console.log('[main.js]: ' + ClientName);                    //log ClientName
  SetTrayMenu();                                              //updates the Menu
});
ipcMain.on('peerJoined', (event, peer) => {                           //triggerd in ui.js
  peers[peers.length] = {name: peer.name.displayName, id: peer.id};   //adds name and id to peers
  console.log('[main.js]: \'' + peer.name.displayName + '\' joined!') //log that peer joined
  SetTrayMenu();                                                //updates the Menu
});
ipcMain.on('clearPeers', () => {                //triggerd in ui.js
  peers = [];                                   //clear all peers
  console.log('[main.js]: ' + 'cleared peers')  //log that peers cleared
  SetTrayMenu();                                //then updates the Menu
});
ipcMain.on('peerLeft', (event, peerId) => {       //triggerd in ui.js
  var PeerPos;                                    //local variable for peers[pos]
  for(let i = 0; i < peers.length; i++){          //loop though all peers
    if(peers[i].id == peerId){                    //if peer was found 
      PeerPos = i;                                //save pos
    }
  };
  if(PeerPos == null){return;};                   //if peer doesnt exist, no need for removal
  console.log('[main.js]: ' + 'Peer \'' + peers[PeerPos].name + '\' left');   //log that peer left
  if(peers.length == 1){                          //if only one peer exists
    peers = [];                                   //remove and done
  } else {
    for(let i = 0; i < peers.length; i++){        //loop though peers
      if (i > PeerPos){                           //if they are after the one removed
        peers[i - 1] = peers[i];                  //move them up one
      };
    };
    peers.pop();                            //remove the last entery (duplicate of one before last)
  };
  SetTrayMenu();                    //Update the Menu
});

//lieners for recive events
ipcMain.on('file-recived', (event, data)=>{
  if(GetAutoDownloadCheckboxState()){
    data.path = store.get('DownloadPath') + '/';    //getting download path //this will not work on windows, use 'path' somehow 
    win.webContents.send('get-url', data);          //triggers ui.js
  }
});
ipcMain.on('recieved-URL',(event, url) => {
  shell.openExternal(url);            //open via default browser
});
//END



//when App ready, call createWindow and build the Tray icon
app.whenReady().then(() => {//wrapped more in .then()
  createWindow();
  StartNotification();
  tray = new Tray(path.join(__dirname, '/../images/logo_transparent_white_512x512.png'));   // /../ cause thats the relation after dist
  SetTrayMenu(); //build TrayMenu
});
//END


//function to create the Snapdrop window
function createWindow () { 
  var clientScreen = screen.getPrimaryDisplay();//get screen info
  win = new BrowserWindow({                     //create a Browser Window
    width: 400,                                 //constant size for Debug
    height: 800,
    x: clientScreen.workArea.width + clientScreen.workArea.x - 400,       //position about right
    y: clientScreen.workArea.height + clientScreen.workArea.y- 800,
    show: GetDebugCheckboxState(),              //get checkbox states
    icon: path.join(__dirname, '/../images/logo_transparent_512x512.png'),//set icon in Taskbar
    webPreferences: {
      nodeIntegration: true,  // for ipcRenderer.send/on ...
      contextIsolation: false //this is a bad idea according to: https://github.com/electron/electron/issues/23506 but needed for 'require',
                              //index.html doesnt conatain 'untrusted content' so its not dangerus
                              //https://www.electronjs.org/docs/tutorial/security#isolation-for-untrusted-content
    }
  });
  win.loadFile('index.html'); //load the .html
};
//END


//Start and Quit notification functions
//Start
function StartNotification () {
  const notification = {                  //create Notification with properties
    title: 'Snapdrop',
    body: 'Started succsessfully!',
    icon: path.join(__dirname, '/../images/logo_transparent_512x512.png')
  };
  if(store.get('Debug')){                 //get saved checkbox state
    new Notification(notification).show();//show Notification
  };
};
//Quit
function QuitNotification () {
  const QuitNotification = {                    //create Notification with properties
    title: 'Snapdrop Quit',
    body: 'The window needs to stay open in order for the tray icon to work (this will not show again)',
    icon: path.join(__dirname, '/../images/logo_transparent_512x512.png'), //set icon in Taskbar
  };
  SaveStates();
  if (store.get('QuitNotification')) {          //get checkbox state
    store.set('QuitNotification', false);       //show once 
    new Notification(QuitNotification).show();  //show Notification
    setTimeout(app.quit(), 5000);               //wait, cause the notification wouldn't show otherwise
  } else {
    app.quit();           // else, instant-quit
  };
};
//END


//function to construct a TrayMenu
function SetTrayMenu(){
  if(tray == null){               //is this needed?
    console.log('tray == null');
    return
  };

  var DeviceTextSubmenu = [                           //Submenu for sending Text
    { label: ClientName, id: 'clientname'},
    { label: 'NameSeperator', type: 'separator'}
  ];
  if(peers.length == 0){                              //if no peers exist
    DeviceTextSubmenu[2] = { label: 'Open Snapdrop on other devices to send messages'}; //insert this
  } else {
    for (let i = 0; i < peers.length; i++){           //loop though peers
      DeviceTextSubmenu[3 + i] = { label: peers[i].name, click () {SendTextTo(peers[i].id)}}; //and add them //3+i cause of clientname ans seperator
    };
  };

  var DeviceFilesSubmenu = [                          //Submenu for sending files
    { label: ClientName, id: 'clientname'},
    { label: 'NameSeperator', type: 'separator'}
  ];
  if(peers.length == 0){                              //if no peers exist
    DeviceFilesSubmenu[2] = { label: 'Open Snapdrop on other devices to send files'}; //insert this
  } else {
    for (let i = 0; i < peers.length; i++){           //loop though peers
      DeviceFilesSubmenu[3 + i] = { label: peers[i].name, click () {SendFilesTo(peers[i].id, peers[i].name)}}; //and add them //3+i cause of clientname ans seperator
    };
  };
  contextMenu = Menu.buildFromTemplate([    //construct a new contextMenu for setting
    { label: 'Settings', id:'checkboxes', submenu: SettingsSubmenu()},      //settings submenu
    { label: 'Send Files', id: 'sendfiles', submenu: DeviceFilesSubmenu},   //filesSubmenu
    { label: 'Send Text', id: 'sendtext', submenu: DeviceTextSubmenu},      //textSubmenu
    { label: 'QuitSeperator', type: 'separator'},
    {label: 'Reload', click() {SaveStates();win.webContents.send('disconnect');app.relaunch();app.exit()}},    //Reload after saving prefs and disconnect
    { label: 'Quit All', click () {SaveStates();app.quit()}},               //buttion to quit all
  ]);
  tray.setContextMenu(contextMenu);         //setting contextMenu
  tray.setToolTip(GetToolTip());            //get the text shown when hovering over the TrayIcon //non linux for some reason
};
//END


//fuctions For sending Text/Files
function SendTextTo (id){//Text
  txt = new BrowserWindow({ //create new BrowserWindow
    width: 400,
    height: 210,
    frame: false,
    icon: path.join(__dirname, '/../images/logo_transparent_512x512.png'), //set icon in Taskbar
    transparent: true,                //doesnt work for linux, background will be square, not round
    backgroundColor: '#00121212',     //since fully transparent isnt possible on linux (#00..) is shows up black --Find a way to determin client OS
    webPreferences: {
      nodeIntegration: true,          //for ipcRenderer.send()
      contextIsolation: false         // see line 89
    }
  });
  txt.loadFile('TextDialog.html');    //load the .html
  ipcMain.on('textInput', (event, textGiven) => {                 //triggerd in TextDialog.html
    win.webContents.send('sendText', {text: textGiven, to: id}); //triggers network.js 
    txt.destroy()                 //destroy the window
  });
  ipcMain.on('textInputCancel', () => {txt.destroy()}); //triggerd in TextDialog.html
};

function SendFilesTo (id, name){  //Files
  var paths = dialog.showOpenDialogSync({           //open dialog syncronus
    title: 'Select files for \'' + name + '\'',     //set title for dialog 
    buttonLabel: 'Send',                            //change open butten to 'Send'
    properties: ['openFile', 'multiSelections']     //with proerties
  });
  if(paths == null ){return;};                      //retun if user canceld the promp
    
  var dataSend = [];var nameSend = [];var typeSend = [];  //temp variable reset
  for(let i = 0; i < paths.length; i++){            // loop though filepaths 
    dataSend[i] = fs.readFileSync(paths[i]);          //read the file
    nameSend[i] = path.parse(paths[i]).base;          //get filename
    typeSend[i] = mime.lookup(paths[i]);              //get MIME-Type
    if(typeSend[i] == false){                         //if no type was recognised
      typeSend[i] = 'application/octet-stream'          //use 'binary' (no extention)
    }
  };

  win.webContents.send('sendFiles', { //triggers network.js
    to: id,
    files: [],
    data: dataSend,
    name: nameSend,
    type: typeSend 
  });
};
//END

//function that returns the Settings Submenu
function SettingsSubmenu(){
  var submenu =[
    { label: 'Lauch on startup', id: 'auto', type: 'checkbox', checked: GetAutoLauncheckboxState()},  //Settings via checkboxes
    { label: 'Debug', id: 'debug', type: 'checkbox', checked: GetDebugCheckboxState() },
    { label: 'Auto Download', id: 'download', type: 'checkbox', checked: GetAutoDownloadCheckboxState() },
    { label: 'Set Download Path', click() {RequestDownloadPath()}},
    { label: 'ApplySeperator', type: 'separator'},
    { label: 'Apply', click() {SaveStates();win.webContents.send('disconnect');app.relaunch();app.exit()}} //relaunch to apply changes and disconnect
  ];
  return submenu; //return the submenu
};
//END

//function to get a download Path
function RequestDownloadPath(){
  var path = dialog.showOpenDialogSync({
    title:'Select a Folder for Automatic Downloads',
    defaultPath: store.get('DownloadPath') ?? app.getPath('downloads'),
    buttonLabel:'Save Path',
    properties: ['openDirectory']
  });
  if(path != null){
    store.set('DownloadPath', path[0]); //save path
  }
  return path;
}


//function that returns the proper ToolTip string //DESNT WORK ON LINUX: https://github.com/electron/electron/issues/25976
function GetToolTip(){
  if(ClearName == null){
    return 'Snapdrop';
  }else{
    return 'You\'re ' + ClearName;
  };
}
//END



//Get Stored Checkbox Startes or return the default value
function GetAutoLauncheckboxState(){
  if(store.get('AutoLaunch')==null){
    return true;  //default AutoLaunch = true
  } else {
    return store.get('AutoLaunch');
  }
};
function GetDebugCheckboxState(){
  if(store.get('Debug')==null){
    return false;  //default Debug = false
  } else {
    return store.get('Debug');
  }
};
function GetAutoDownloadCheckboxState(){
  if(store.get('AutoDownload')==null){
    return false;  //default AutoDownload = false
  } else {
    return store.get('AutoDownload');
  }
};
//END





//save users Prefrences
function SaveStates(){
  store.set('AutoLaunch', contextMenu.commandsMap[contextMenu.getMenuItemById('checkboxes').commandId].submenu.commandsMap[contextMenu.getMenuItemById('auto').commandId].checked );
  store.set('Debug', contextMenu.commandsMap[contextMenu.getMenuItemById('checkboxes').commandId].submenu.commandsMap[contextMenu.getMenuItemById('debug').commandId].checked );
  store.set('AutoDownload', contextMenu.commandsMap[contextMenu.getMenuItemById('checkboxes').commandId].submenu.commandsMap[contextMenu.getMenuItemById('download').commandId].checked );
  
  var autolauncher = new AutoLaunch({
    name: 'SnapdropTray'              //no path needs to be specyfied; https://github.com/Teamwork/node-auto-launch/issues/99 -> this is why productName='SnapdropTray' and not 'Snapdrop Tray'
  });
  GetAutoLauncheckboxState() ? autolauncher.enable() : autolauncher.disable();    //en- or disable
};
//END


//if all windows get closed, call QuitNotification
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    QuitNotification()
  }
})
//END