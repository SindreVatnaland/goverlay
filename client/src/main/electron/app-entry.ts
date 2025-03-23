import { BrowserWindow, Menu, Tray } from "electron";
import { screen, app } from "electron";

import os from 'os';
import AmdOverlay from 'electron-overlay-amd';
// @ts-ignore
import IntelOverlay from 'electron-overlay-intel';
import path from "path";

const isIntelCpu = () => {
    return os.cpus()[0]?.model?.toLowerCase().includes('intel');
}

const isAmdCpu = () => {
    return os.cpus()[0]?.model?.toLowerCase().includes('amd');
}

export const getInjector = async () => {
    console.log(`isIntelCpu: ${isIntelCpu()}, isAmdCpu: ${isAmdCpu()}`, os.platform());

    const isAmd = isAmdCpu();
    const isIntel = isIntelCpu();

    if (isAmd) {
        return AmdOverlay;
    } else if (isIntel) {
        return IntelOverlay;
    } else {
        return null;
    }

};

class Application {
  private windows: Map<string, Electron.BrowserWindow>;

  private Overlay;
  private scaleFactor = 1.0;

  private tray: Electron.Tray | null;

  constructor() {
    this.windows = new Map();
  }
  
  public async startOverlay() {
    this.Overlay = await getInjector();
    this.Overlay!.start();

    this.Overlay!.setEventCallback((event: string, payload: any) => {
      console.log(`event: ${event}, payload: ${JSON.stringify(payload)}`);
    });
  }

  public setupSystemTray() {
    if (!this.tray) {
      this.tray = new Tray(
        path.join(global.CONFIG.distDir, "assets/icon-16.png")
      );
      const contextMenu = Menu.buildFromTemplate([
        {
          label: "Quit",
          click: () => {
            app.exit();
          },
        },
      ]);
      this.tray.setToolTip("Welcome");
      this.tray.setContextMenu(contextMenu);

    }
  }

  public addOverlayWindow(
    name: string,
    window: Electron.BrowserWindow,
    dragborder: number = 0,
    captionHeight: number = 0,
    transparent: boolean = false
  ) {
    const display = screen.getDisplayNearestPoint(
      screen.getCursorScreenPoint()
    );

    this.Overlay!.addWindow(window.id, {
      name,
      transparent,
      resizable: window.isResizable(),
      maxWidth: window.isResizable
        ? display.bounds.width
        : window.getBounds().width,
      maxHeight: window.isResizable
        ? display.bounds.height
        : window.getBounds().height,
      minWidth: window.isResizable ? 100 : window.getBounds().width,
      minHeight: window.isResizable ? 100 : window.getBounds().height,
      nativeHandle: window.getNativeWindowHandle().readUInt32LE(0),
      rect: {
        x: window.getBounds().x,
        y: window.getBounds().y,
        width: Math.floor(window.getBounds().width * this.scaleFactor),
        height: Math.floor(window.getBounds().height * this.scaleFactor),
      },
      caption: {
        left: Math.floor(dragborder * this.scaleFactor),
        right: Math.floor(dragborder* this.scaleFactor),
        top: Math.floor(dragborder * this.scaleFactor),
        height: Math.floor(captionHeight * this.scaleFactor),
      },
      dragBorderWidth: Math.floor(dragborder),
    });

    window.webContents.on(
      "paint",
      (event, dirty, image: Electron.NativeImage) => {
        this.Overlay!.sendFrameBuffer(
          window.id,
          image.getBitmap(),
          image.getSize().width,
          image.getSize().height
        );
      }
    );

    // window.on("move", () => {
    //   this.Overlay!.sendWindowBounds(window.id, {
    //     rect: {
    //       x: window.getBounds().x,
    //       y: window.getBounds().y,
    //       width: Math.floor(window.getBounds().width * this.scaleFactor),
    //       height: Math.floor(window.getBounds().height * this.scaleFactor),
    //     },
    //   });
    // });

    const windowId = window.id;
    window.on("closed", () => {
      this.Overlay!.closeWindow(windowId);
    });
  }

  public createOsrStatusbarWindow() {
    const options: Electron.BrowserWindowConstructorOptions = {
      x: 0, 
      y: 0,
      height: 400,
      width: 600,
      frame: false,
      show: false,
      transparent: true,
      resizable: false,
      backgroundColor: "#00000000",
      webPreferences: {
        offscreen: true,
        nodeIntegration: true,
      },
    };

    const name = "StatusBar";
    const window = this.createWindow(name, options);

    // window.webContents.openDevTools({
    //   mode: "detach"
    // })
    window.loadURL(
      "http://google.com"
    );

    this.addOverlayWindow(name, window, 0, 0);
    return window;
  }

  public start() {

    this.setupIpc();
    this.setupSystemTray();

  }

  public activate() {
  }

  private createWindow(
    name: string,
    option: Electron.BrowserWindowConstructorOptions
  ) {
    const window = new BrowserWindow(option);
    this.windows.set(name, window);
    window.on("closed", () => {
      this.windows.delete(name);
    });

    return window;
  }

  private async setupIpc() {
      this.scaleFactor = 1.0

      console.log(`starting overlay...`)
      await this.startOverlay();

      // await new Promise((resolve) => setTimeout(resolve , 5000));
      this.createOsrStatusbarWindow();
      
      const arg = "Dolphin"
      for (const window of this.Overlay.getTopWindows()) {
        if (window.title.indexOf(arg) !== -1) {
          console.log(`--------------------\n injecting ${JSON.stringify(window)}`);
          const result = this.Overlay.injectProcess(window);
          console.log(`--------------------\n injecting result ${JSON.stringify(result)}`);
        }
      }

  }
}

export { Application };
