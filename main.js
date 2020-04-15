"use strict";
/*window.onload = () => {
  // HTMLにあるcanvasを持ってくる
  let canvas = document.getElementById("canvas");
  if (canvas === null || !(canvas instanceof HTMLCanvasElement)) return;
  let context = canvas.getContext("2d");
  if (context === null) return;

  // スクリーンになるcanvasを作成
  let screenCanvas: HTMLCanvasElement = document.createElement("canvas");
  let screenContext = screenCanvas.getContext("2d");
  if (screenContext === null) return;

  // スクリーンに描画
  screenContext.fillStyle = "red";
  screenContext.fillRect(50, 50, 30, 30);

  // メインのcanvasに描画
  context.drawImage(screenCanvas, 0, 0);
}*/
function imageLoader(sources, callback = () => { }, progress = {
    registeredCount: 0,
    finishedCount: 0,
    loadedImage: new Map()
}) {
    progress.registeredCount += sources.length;
    sources.forEach(source => {
        const image = new Image();
        image.onload = function () {
            progress.loadedImage.set(source, image);
            progress.finishedCount++;
            if (progress.registeredCount === progress.finishedCount)
                callback();
        };
        image.src = source;
    });
    return progress;
}
// ただの（アニメーションしない）テクスチャを作る
function createStaticTexture(source, offsetX, offsetY) {
    return {
        draw: (x, y, layers, resources) => {
            const image = resources.get(source);
            if (image === undefined) {
                console.log("not loaded yet");
                return;
            }
            layers[0].drawImage(image, offsetX + x, offsetY + y);
        }
    };
}
function createStaticVolumeTexture(source, offsetX, offsetY, sh) {
    return {
        draw: (x, y, layers, resources) => {
            const image = resources.get(source);
            if (image === undefined) {
                console.log("not loaded yet");
                return;
            }
            for (var i = 0; i < layerNum; i++)
                layers[i].drawImage(image, 0, i * sh, image.width, sh, offsetX + x, offsetY + y, image.width, sh);
        }
    };
}
// 使いたい画像を配列で指定してロードにかける。ロードが終わったときに呼ぶ関数を指定しとく。第三引数は以前のLoadingProgressに引き続きロードしたい時に使う。
let imageLoadingProgress = imageLoader(["volumeTest0.png", "volumeTest1.png", "volumeTest2.png"], draw);
// sourceをID代わりにしてコンストラクタに指定
let tex0 = createStaticVolumeTexture("volumeTest0.png", 0, 0, 32);
let tex1 = createStaticVolumeTexture("volumeTest1.png", 0, 0, 32);
let tex2 = createStaticVolumeTexture("volumeTest2.png", 0, 0, 32);
const layerNum = 8;
const layerW = 256;
const layerH = 256;
const compositW = 200;
const compositH = 200;
function draw() {
    const canvas = (() => {
        const x = document.getElementById("canvas");
        if (x === null || !(x instanceof HTMLCanvasElement))
            throw new Error("canvas not found");
        return x;
    })();
    const context = (() => {
        const x = canvas.getContext("2d");
        if (x === null)
            throw new Error("context2d not found");
        return x;
    })();
    context.imageSmoothingEnabled = false;
    const layers = [];
    for (var i = 0; i < layerNum; i++)
        layers.push(create2dScreen(layerW, layerH));
    const composition = create2dScreen(compositW, compositH);
    for (let i = 0; i < layerNum; i++)
        document.body.appendChild(layers[i].canvas);
    document.body.appendChild(composition.canvas);
    let counter = 0;
    let start = performance.now();
    loop();
    function loop() {
        counter++;
        clearLayers(layers);
        tex0.draw(64, 64, layers, imageLoadingProgress.loadedImage);
        tex0.draw(96, 64, layers, imageLoadingProgress.loadedImage);
        tex0.draw(128, 64, layers, imageLoadingProgress.loadedImage);
        tex0.draw(64, 96, layers, imageLoadingProgress.loadedImage);
        tex0.draw(96, 96, layers, imageLoadingProgress.loadedImage);
        tex0.draw(128, 96, layers, imageLoadingProgress.loadedImage);
        tex0.draw(64, 128, layers, imageLoadingProgress.loadedImage);
        tex0.draw(96, 128, layers, imageLoadingProgress.loadedImage);
        tex0.draw(128, 128, layers, imageLoadingProgress.loadedImage);
        tex1.draw(80, 80, layers, imageLoadingProgress.loadedImage);
        tex1.draw(100, 80, layers, imageLoadingProgress.loadedImage);
        tex1.draw(80, 100, layers, imageLoadingProgress.loadedImage);
        tex2.draw(100, 93, layers, imageLoadingProgress.loadedImage);
        /*
        layers[0].fillStyle = "red";
        layers[0].fillRect(100, 100, 200, 200);
        layers[1].clearRect(0, 0, 256, 256);
        layers[1].fillStyle = "blue";
        layers[1].fillRect(Math.random() * 300, Math.random() * 300, Math.random() * 200, Math.random() * 200);
        */
        if (counter % 60 === 0)
            document.getElementById("fps").innerText = (counter * 1000 / (performance.now() - start));
        composit();
        requestAnimationFrame(loop);
    }
    function clearLayers(layers) {
        for (var i = 0; i < layerNum; i++) {
            layers[i].clearRect(0, 0, layerW, layerH);
        }
    }
    function composit() {
        const compositOffsetX = -(compositW - layerW) / 2;
        const compositOffsetY = -(compositH - layerH) / 2;
        const directionX = 3;
        const directionY = 3;
        composition.clearRect(0, 0, compositW, compositH);
        for (let j = 2; j < layerNum; j++) {
            //手前の影をずらしながら重ねて
            composition.globalCompositeOperation = "source-over";
            for (let i = j; i < layerNum; i++)
                composition.drawImage(layers[i].canvas, compositOffsetX + directionX * (i - 2), compositOffsetY + directionY * (i - 2));
            //打ち抜く
            composition.globalCompositeOperation = "destination-out";
            composition.drawImage(layers[j].canvas, compositOffsetX, compositOffsetY);
        }
        composition.globalCompositeOperation = "source-atop";
        composition.drawImage(layers[1].canvas, compositOffsetX, compositOffsetY);
        composition.globalCompositeOperation = "destination-over";
        composition.drawImage(layers[0].canvas, compositOffsetX, compositOffsetY);
        context.clearRect(0, 0, 400, 400);
        context.drawImage(composition.canvas, 0, 0, 400, 400);
    }
    function create2dScreen(width, height) {
        let canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        let context = canvas.getContext("2d");
        if (context === null)
            throw new Error("failed to get 2D context");
        return context;
    }
}
