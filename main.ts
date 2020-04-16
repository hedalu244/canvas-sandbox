type ImageResources = Map<string, HTMLImageElement>;
interface ImageLoadingProgress {
  finishedCount: number;
  registeredCount: number;
  imageResources: ImageResources;
}
function imageLoader(sources: string[], callback: ()=>void = () => { }, progress: ImageLoadingProgress = {
    registeredCount: 0,
    finishedCount: 0,
    imageResources: new Map()
  }) {
  progress.registeredCount += sources.length;
  
  sources.forEach(source => {
    const image = new Image();
    image.onload = function() {
      progress.imageResources.set(source, image);
      progress.finishedCount++;
      if (progress.registeredCount === progress.finishedCount)
        callback();
    }
    image.src = source;
  });

  return progress;
}

interface Camera {
  offsetX: number;
  offsetY: number;

  lightColor: CanvasRenderingContext2D;
  shadowColor: CanvasRenderingContext2D;
  volumeLayers: CanvasRenderingContext2D[];
  
  compositScreen: CanvasRenderingContext2D;
  shadowAccScreens: CanvasRenderingContext2D[];

  compositOffsetX: number;
  compositOffsetY: number;
}

function initCamera(width: number, height: number): Camera {
  const marginTop = 28;
  const marginLeft = 28;
  const marginRignt = 0;
  const marginBottom = 0;

  const lightColor = create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom);
  const shadowColor = create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom);
  const volumeLayers: CanvasRenderingContext2D[] = [];
  for(let i = 0; i < 6; i++)
    volumeLayers.push(create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom));

  const shadowAccScreens: CanvasRenderingContext2D[] = [];
  for(let i = 0; i < volumeLayers.length; i++) 
    shadowAccScreens.push(create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom));

  const compositScreen = create2dScreen(width, height);
  
  return {
    offsetX: 0,
    offsetY: 0,

    lightColor,
    shadowColor,
    volumeLayers,

    compositScreen,
    shadowAccScreens,
    
    compositOffsetX: -marginLeft,
    compositOffsetY: -marginTop,
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

function composit(camera: Camera, mainScreen: CanvasRenderingContext2D): void {
  const shadowDirectionX = 3;
  const shadowDirectionY = 2;

  // shadowAccScreens[i]にはi-1層目に落ちる影を描画する
  for(let i = camera.volumeLayers.length - 1; 0 <= i; i--) {
    camera.shadowAccScreens[i].globalCompositeOperation = "source-over";
    camera.shadowAccScreens[i].drawImage(
      camera.volumeLayers[i].canvas, 0, 0);
    if(i !== camera.volumeLayers.length - 1)
    camera.shadowAccScreens[i].drawImage(
      camera.shadowAccScreens[i + 1].canvas, shadowDirectionX, shadowDirectionY);  
  }
  
  for(let i = 0; i < camera.shadowAccScreens.length; i++) {
    //i-1層目の形で打ち抜く
    if(i !== 0) {
      camera.shadowAccScreens[i].globalCompositeOperation = "source-in";
      camera.shadowAccScreens[i].drawImage(
        camera.volumeLayers[i - 1].canvas, -shadowDirectionY, -shadowDirectionY);
    }
    //compositに累積
    camera.compositScreen.globalCompositeOperation = "source-over";
    camera.compositScreen.drawImage(camera.shadowAccScreens[i].canvas,
      camera.compositOffsetX + shadowDirectionX,
      camera.compositOffsetY + shadowDirectionY);
    //見えなくなる部分を隠す
    camera.compositScreen.globalCompositeOperation = "destination-out";
    camera.compositScreen.drawImage(
      camera.volumeLayers[i].canvas, camera.compositOffsetX, camera.compositOffsetY);
  }
  //*
  // 影部分が不透明な状態になっているはずなので、影色で上書きする
  camera.compositScreen.globalCompositeOperation = "source-atop";
  camera.compositScreen.drawImage(camera.shadowColor.canvas,
    camera.compositOffsetX,
    camera.compositOffsetY);
  // 残りの部分に光色
  camera.compositScreen.globalCompositeOperation = "destination-over";
  camera.compositScreen.drawImage(camera.lightColor.canvas,
    camera.compositOffsetX,
    camera.compositOffsetY);
  //*/
  // メインスクリーン（本番のcanvas）にスムージングなしで拡大
  mainScreen.imageSmoothingEnabled = false;
  mainScreen.clearRect(0, 0, 400, 400);
  mainScreen.drawImage(camera.compositScreen.canvas, 0, 0, 400, 400);

  /*
  //次フレームの描画に備えてレイヤーを消去
  camera.lightColor.clearRect(0, 0, camera.lightColor.canvas.width, camera.shadowColor.canvas.height);
  camera.shadowColor.clearRect(0, 0, camera.shadowColor.canvas.width, camera.shadowColor.canvas.height);
  for(var i = 0; i < camera.volumeLayers.length; i++)
    camera.volumeLayers[i].clearRect(0, 0, camera.volumeLayers[i].canvas.width, camera.volumeLayers[i].canvas.height);
  */
  camera.compositScreen.clearRect(0, 0, camera.compositScreen.canvas.width, camera.compositScreen.canvas.height);
}

interface Texture {
  // これの実装を色々にしてアニメーションなどを表現する
  draw: (x:number, y:number, camera:Camera, resources:ImageResources) => void;
}

// 四角を描画するテクスチャ
function createRectTexture(lightColor: string, width: number, height: number, shadowColor: string = lightColor): Texture{
  return {
    draw: (x:number, y:number, camera:Camera, resources:ImageResources) => {
      camera.lightColor.fillStyle = lightColor;
      camera.lightColor.fillRect(x, y, width, height);
      camera.shadowColor.fillStyle = shadowColor;
      camera.shadowColor.fillRect(x, y, width, height);
    }
  }
}

// ただの（アニメーションしない、影も落とさないし受けない）テクスチャを作る
function createStaticTexture(source: string, textureOffsetX: number, textureOffsetY: number): Texture{
  return {
    draw: (x:number, y:number, camera:Camera, resources:ImageResources) => {
      const image = resources.get(source);
      if (image === undefined) { console.log("not loaded yet"); return; }
      camera.lightColor.drawImage(image,
        camera.offsetX + textureOffsetX + x,
        camera.offsetY + textureOffsetY + y);
      camera.shadowColor.drawImage(image,
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
      
      camera.lightColor.drawImage(image, 0, 0, image.width, sh,
        camera.offsetX + textureOffsetX + x,
        camera.offsetY + textureOffsetY + y, image.width, sh);

      camera.shadowColor.drawImage(image, 0, sh, image.width, sh,
        camera.offsetX + textureOffsetX + x,
        camera.offsetY + textureOffsetY + y, image.width, sh);

      for(var i = 0; i < camera.volumeLayers.length; i++)
        camera.volumeLayers[i].drawImage(image, 0, (i + 2) * sh, image.width, sh,
          camera.offsetX + textureOffsetX + x,
          camera.offsetY + textureOffsetY + y, image.width, sh);
    }
  }
}

function drawObject(anyGameObject: { textures:Texture[] }, camera: Camera, imageResources: ImageResources) {
  anyGameObject.textures[0].draw(64, 64, camera, imageResources);
  anyGameObject.textures[0].draw(96, 64, camera, imageResources);
  anyGameObject.textures[0].draw(128, 64, camera, imageResources);
  anyGameObject.textures[0].draw(64, 96, camera, imageResources);
  anyGameObject.textures[0].draw(96, 96, camera, imageResources);
  anyGameObject.textures[0].draw(128, 96, camera, imageResources);
  anyGameObject.textures[0].draw(64, 128, camera, imageResources);
  anyGameObject.textures[0].draw(96, 128, camera, imageResources);
  anyGameObject.textures[0].draw(128, 128, camera, imageResources);

  anyGameObject.textures[1].draw(80, 80, camera, imageResources);
  anyGameObject.textures[1].draw(102, 80, camera, imageResources);
  anyGameObject.textures[1].draw(80, 100, camera, imageResources);
  
  anyGameObject.textures[2].draw(102, 93, camera, imageResources);
}

//デバッグ用
let counter = 0;
let start: number;

function animationLoop(anyGameObject: { textures:Texture[] }, camera: Camera, mainScreen: CanvasRenderingContext2D,  imageLoadingProgress: ImageLoadingProgress): void {

  if (imageLoadingProgress.registeredCount === imageLoadingProgress.finishedCount) {
    counter++;

    drawObject(anyGameObject, camera, imageLoadingProgress.imageResources);

    if(counter % 60 === 0) 
      document.getElementById("fps").innerText = (counter * 1000 / (performance.now() - start));
  
    composit(camera, mainScreen);
  }
  else {
    console.log("loading " + imageLoadingProgress.finishedCount + "/" + imageLoadingProgress.registeredCount);
    mainScreen.fillText("loading", 0, 0);
  }
  
  requestAnimationFrame(() => animationLoop(anyGameObject, camera, mainScreen, imageLoadingProgress));
}

window.onload = () => {
  const canvas = document.getElementById("canvas");
  if　(canvas === null || !(canvas instanceof HTMLCanvasElement))
    throw new Error("canvas not found");
  
  const mainScreen = canvas.getContext("2d");
  if　(mainScreen === null)
    throw new Error("context2d not found");

  const camera = initCamera(mainScreen.canvas.width / 2, mainScreen.canvas.height / 2);

  //デバッグ用
  for(let i = 0; i < camera.volumeLayers.length; i++)
    document.body.appendChild(camera.volumeLayers[i].canvas);
    for(let i = 0; i < camera.volumeLayers.length; i++)
      document.body.appendChild(camera.shadowAccScreens[i].canvas);
  document.body.appendChild(camera.compositScreen.canvas);
  
  // sourceをID代わりにしてコンストラクタに指定
  const anyGameObject = {
    textures: [createStaticVolumeTexture("volumeTest0.png", 0, 0, 32),
      createStaticVolumeTexture("volumeTest1.png", 0, 0, 32),
      createStaticVolumeTexture("volumeTest2.png", 0, 0, 32)
    ]
  }

  // 使いたい画像を配列で指定してロードにかける。ロードが終わったときに呼ぶ関数を指定しとく。第三引数は以前のLoadingProgressに引き続きロードしたい時に使う。
  let imageLoadingProgress = imageLoader(["volumeTest0.png", "volumeTest1.png", "volumeTest2.png"], () => {
    start = performance.now()
  });

  animationLoop(anyGameObject, camera, mainScreen, imageLoadingProgress)
}