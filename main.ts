type ImageResources = Map<string, HTMLImageElement>;
interface ImageLoadingProgress {
  finishedCount: number;
  registeredCount: number;
  loadedImage: ImageResources;
}
function imageLoader(sources: string[], callback: ()=>void = () => { }, progress: ImageLoadingProgress = {
    registeredCount: 0,
    finishedCount: 0,
    loadedImage: new Map()
  }) {
  progress.registeredCount += sources.length;
  
  sources.forEach(source => {
    const image = new Image();
    image.onload = function() {
      progress.loadedImage.set(source, image);
      progress.finishedCount++;
      if (progress.registeredCount === progress.finishedCount)
        callback();
    }
    image.src = source;
  });

  return progress;
}

interface Camera {
  layerNum: 8;

  layers: CanvasRenderingContext2D[];
  composition: CanvasRenderingContext2D;

  offsetX: number;
  offsetY: number;

  mainScreen: CanvasRenderingContext2D;
  
  compositOffsetX: number;
  compositOffsetY: number;
  
  shadowDirectionX: number;
  shadowDirectionY: number;
}

function initCamera(mainScreen: CanvasRenderingContext2D): Camera {
  const layerNum = 8;
  const layerW = 256;
  const layerH = 256;

  const compositW = mainScreen.canvas.width / 2;
  const compositH = mainScreen.canvas.height / 2;

  const compositOffsetX = -(compositW - layerW) / 2;
  const compositOffsetY = -(compositH - layerH) / 2;

  const shadowDirectionX = 3;
  const shadowDirectionY = 3;

  const layers: CanvasRenderingContext2D[] = [];
  for(var i = 0; i < layerNum; i++) 
    layers.push(create2dScreen(layerW, layerH));

  const composition = create2dScreen(compositW, compositH);
  
  return {
    layerNum,

    layers,
    composition,

    offsetX: 0,
    offsetY: 0,

    mainScreen,
    
    compositOffsetX,
    compositOffsetY,
  
    shadowDirectionX,
    shadowDirectionY,
  };
  
  function create2dScreen(width: number, height: number): CanvasRenderingContext2D {
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    let context = canvas.getContext("2d");
    if (context === null) throw new Error("failed to get 2D context");
    return context;
  }
}

function composit(camera: Camera): void {
  camera.composition.clearRect(0, 0, camera.composition.canvas.width, camera.composition.canvas.height);
  
  for(let j = 2; j < camera.layerNum; j++) {
    //手前の影をずらしながら重ねて
    camera.composition.globalCompositeOperation = "source-over";
    for(let i = j; i < camera.layerNum; i++)
      camera.composition.drawImage(camera.layers[i].canvas,
         camera.compositOffsetX + camera.shadowDirectionX * (i - 2),
         camera.compositOffsetY + camera.shadowDirectionY * (i - 2));
    //打ち抜く
    camera.composition.globalCompositeOperation = "destination-out";
    camera.composition.drawImage(camera.layers[j].canvas,
      camera.compositOffsetX,
      camera.compositOffsetY);
  }
  camera.composition.globalCompositeOperation = "source-atop";
  camera.composition.drawImage(camera.layers[1].canvas,
    camera.compositOffsetX,
    camera.compositOffsetY);
  camera.composition.globalCompositeOperation = "destination-over";
  camera.composition.drawImage(camera.layers[0].canvas,
    camera.compositOffsetX,
    camera.compositOffsetY);
  
  camera.mainScreen.clearRect(0, 0, 400, 400);
  camera.mainScreen.drawImage(camera.composition.canvas, 0, 0, 400, 400);

  //次フレームの描画に備えてレイヤーを消去
  for(var i = 0; i < camera.layerNum; i++)
    camera.layers[i].clearRect(0, 0, camera.layers[i].canvas.width, camera.layers[i].canvas.height);
}

interface Texture {
  // これの実装を色々にしてアニメーションなどを表現する
  draw: (x:number, y:number, camera:Camera, resources:ImageResources) => void;
}

// ただの（アニメーションしない、影も落とさない）テクスチャを作る
function createStaticTexture(source: string, textureOffsetX: number, textureOffsetY: number): Texture{
  return {
    draw: (x:number, y:number, camera:Camera, resources:ImageResources) => {
      const image = resources.get(source);
      if (image === undefined) { console.log("not loaded yet"); return; }
        camera.layers[0].drawImage(image,
          camera.offsetX + textureOffsetX + x,
          camera.offsetY + textureOffsetY + y);
    }
  }
}

function createStaticVolumeTexture(source: string, textureOffsetX:number, textureOffsetY:number, sh:number): Texture {
  return {
    draw: (x:number, y:number, camera:Camera, resources:ImageResources) => {
      const image = resources.get(source);
      if (image === undefined) { console.log("not loaded yet"); return; }
      for(var i = 0; i < camera.layerNum; i++)
        camera.layers[i].drawImage(image, 0, i * sh, image.width, sh,
          camera.offsetX + textureOffsetX + x,
          camera.offsetY + textureOffsetY + y, image.width, sh);
    }
  }
}

// 使いたい画像を配列で指定してロードにかける。ロードが終わったときに呼ぶ関数を指定しとく。第三引数は以前のLoadingProgressに引き続きロードしたい時に使う。
let imageLoadingProgress = imageLoader(["volumeTest0.png", "volumeTest1.png", "volumeTest2.png"], main);
// sourceをID代わりにしてコンストラクタに指定
let tex0 = createStaticVolumeTexture("volumeTest0.png", 0, 0, 32);
let tex1 = createStaticVolumeTexture("volumeTest1.png", 0, 0, 32);
let tex2 = createStaticVolumeTexture("volumeTest2.png", 0, 0, 32);

function main(){
  const canvas: HTMLCanvasElement = (() => {
    const x = document.getElementById("canvas");
    if　(x === null || !(x instanceof HTMLCanvasElement))
      throw new Error("canvas not found");
    return x;
  })();
  const context: CanvasRenderingContext2D = (() => {
    const x = canvas.getContext("2d");
    if　(x === null)
      throw new Error("context2d not found");
    return x;
  })();
  context.imageSmoothingEnabled = false;

  const camera = initCamera(context);

  for(let i = 0; i < camera.layerNum; i++)
    document.body.appendChild(camera.layers[i].canvas);
    document.body.appendChild(camera.composition.canvas);

    let counter = 0;
  let start = performance.now();
  loop();

  function loop(): void {
    counter++;

    tex0.draw(64, 64, camera, imageLoadingProgress.loadedImage);
    tex0.draw(96, 64, camera, imageLoadingProgress.loadedImage);
    tex0.draw(128, 64, camera, imageLoadingProgress.loadedImage);
    tex0.draw(64, 96, camera, imageLoadingProgress.loadedImage);
    tex0.draw(96, 96, camera, imageLoadingProgress.loadedImage);
    tex0.draw(128, 96, camera, imageLoadingProgress.loadedImage);
    tex0.draw(64, 128, camera, imageLoadingProgress.loadedImage);
    tex0.draw(96, 128, camera, imageLoadingProgress.loadedImage);
    tex0.draw(128, 128, camera, imageLoadingProgress.loadedImage);

    tex1.draw(80, 80, camera, imageLoadingProgress.loadedImage);
    tex1.draw(100, 80, camera, imageLoadingProgress.loadedImage);
    tex1.draw(80, 100, camera, imageLoadingProgress.loadedImage);
    
    tex2.draw(100, 93, camera, imageLoadingProgress.loadedImage);
    
    if(counter % 60 === 0) 
      document.getElementById("fps").innerText = (counter * 1000 / (performance.now() - start));
    
    composit(camera);

    requestAnimationFrame(loop);
  }
}