import { BrowserWindow } from "electron";
import { screen, shell } from "electron";
import { loadNativeLib } from "../utils/loadoverlay";

class Application {
  private windows: Map<string, Electron.BrowserWindow>;
  private Overlay;

  constructor() {
    this.windows = new Map();
    this.Overlay = loadNativeLib()
  }

  public startOverlay() {
    this.Overlay!.start();

    this.Overlay!.setEventCallback((event: string, payload: any) => {
      console.log(`event: ${event}, payload: ${JSON.stringify(payload)}`);
    });
  }

  public addOverlayWindow(
    name: string,
    window: Electron.BrowserWindow,
  ) {
    const width = window.getBounds().width;
    const height = window.getBounds().height;

    this.Overlay!.addWindow(window.id, {
      name,
      transparent: true,
      resizable: false,
      maxWidth: width,
      maxHeight: height,
      minWidth: width,
      minHeight: height,
      nativeHandle: window.getNativeWindowHandle().readUInt32LE(0),
      rect: {
        x: window.getBounds().x,
        y: window.getBounds().y,
        width: Math.floor(window.getBounds().width),
        height: Math.floor(window.getBounds().height),
      },
    });

    window.webContents.on(
      "paint",
      (_, __, image: Electron.NativeImage) => {
        this.Overlay!.sendFrameBuffer(
          window.id,
          image.getBitmap(),
          image.getSize().width,
          image.getSize().height
        );
      }
    );

  }

  public createInjectedWindow() {
    const options: Electron.BrowserWindowConstructorOptions = {
      x: 10, 
      y: 10,
      height: 400,
      width: 600,
      frame: false,
      show: false,
      transparent: true,
      resizable: false,
      webPreferences: {
        offscreen: true,
        nodeIntegration: true,
        contextIsolation: false
      },
    };

    const name = "StatusBar";
    const window = this.createWindow(name, options);

    window.loadURL(
      "http://google.com"
    );

    this.addOverlayWindow(name, window);
    return window;
  }

  public start() {
    this.setupIpc();
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
      console.log(`starting overlay...`)
      this.startOverlay();

      this.createInjectedWindow();
      
      const windowName = "D9G"
      for (const window of this.Overlay.getTopWindows()) {
        if (window.title.indexOf(windowName) !== -1) {
          console.log(`--------------------\n injecting ${JSON.stringify(window)}`);
          const result = this.Overlay.injectProcess(window);
          console.log(`injectProcess result: ${result}`);
        }
      }
  }
}

export { Application };
