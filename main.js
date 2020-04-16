"use strict";
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
function initCamera(mainScreen) {
    const layerW = 256;
    const layerH = 256;
    const compositW = mainScreen.canvas.width / 2;
    const compositH = mainScreen.canvas.height / 2;
    const compositOffsetX = -(compositW - layerW) / 2;
    const compositOffsetY = -(compositH - layerH) / 2;
    const shadowDirectionX = 3;
    const shadowDirectionY = 3;
    const lightColor = create2dScreen(compositW, compositH);
    const shadowColor = create2dScreen(compositW, compositH);
    const volumeLayers = [];
    for (var i = 0; i < 6; i++)
        volumeLayers.push(create2dScreen(layerW, layerH));
    const composition = create2dScreen(compositW, compositH);
    return {
        offsetX: 0,
        offsetY: 0,
        mainScreen,
        lightColor,
        shadowColor,
        volumeLayers,
        composition,
        compositOffsetX,
        compositOffsetY,
        shadowDirectionX,
        shadowDirectionY,
    };
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
function composit(camera) {
    for (let j = 0; j < camera.volumeLayers.length; j++) {
        //手前の影をずらしながら重ねて
        camera.composition.globalCompositeOperation = "source-over";
        for (let i = j; i < camera.volumeLayers.length; i++)
            camera.composition.drawImage(camera.volumeLayers[i].canvas, camera.compositOffsetX + camera.shadowDirectionX * i, camera.compositOffsetY + camera.shadowDirectionY * i);
        //打ち抜く
        camera.composition.globalCompositeOperation = "destination-out";
        camera.composition.drawImage(camera.volumeLayers[j].canvas, camera.compositOffsetX, camera.compositOffsetY);
    }
    camera.composition.globalCompositeOperation = "source-atop";
    camera.composition.drawImage(camera.shadowColor.canvas, camera.compositOffsetX, camera.compositOffsetY);
    camera.composition.globalCompositeOperation = "destination-over";
    camera.composition.drawImage(camera.lightColor.canvas, camera.compositOffsetX, camera.compositOffsetY);
    camera.mainScreen.clearRect(0, 0, 400, 400);
    camera.mainScreen.drawImage(camera.composition.canvas, 0, 0, 400, 400);
    /*
    //次フレームの描画に備えてレイヤーを消去
    camera.lightColor.clearRect(0, 0, camera.lightColor.canvas.width, camera.shadowColor.canvas.height);
    camera.shadowColor.clearRect(0, 0, camera.shadowColor.canvas.width, camera.shadowColor.canvas.height);
    for(var i = 0; i < camera.volumeLayers.length; i++)
      camera.volumeLayers[i].clearRect(0, 0, camera.volumeLayers[i].canvas.width, camera.volumeLayers[i].canvas.height);
    camera.composition.clearRect(0, 0, camera.composition.canvas.width, camera.composition.canvas.height);
    */
}
// ただの（アニメーションしない、影も落とさない）テクスチャを作る
function createStaticTexture(source, textureOffsetX, textureOffsetY) {
    return {
        draw: (x, y, camera, resources) => {
            const image = resources.get(source);
            if (image === undefined) {
                console.log("not loaded yet");
                return;
            }
            camera.lightColor.drawImage(image, camera.offsetX + textureOffsetX + x, camera.offsetY + textureOffsetY + y);
        }
    };
}
function createStaticVolumeTexture(source, textureOffsetX, textureOffsetY, sh) {
    return {
        draw: (x, y, camera, resources) => {
            const image = resources.get(source);
            if (image === undefined) {
                console.log("not loaded yet");
                return;
            }
            camera.lightColor.drawImage(image, 0, 0, image.width, sh, camera.offsetX + textureOffsetX + x, camera.offsetY + textureOffsetY + y, image.width, sh);
            camera.shadowColor.drawImage(image, 0, sh, image.width, sh, camera.offsetX + textureOffsetX + x, camera.offsetY + textureOffsetY + y, image.width, sh);
            for (var i = 0; i < camera.volumeLayers.length; i++)
                camera.volumeLayers[i].drawImage(image, 0, (i + 2) * sh, image.width, sh, camera.offsetX + textureOffsetX + x, camera.offsetY + textureOffsetY + y, image.width, sh);
        }
    };
}
// 使いたい画像を配列で指定してロードにかける。ロードが終わったときに呼ぶ関数を指定しとく。第三引数は以前のLoadingProgressに引き続きロードしたい時に使う。
let imageLoadingProgress = imageLoader(["volumeTest0.png", "volumeTest1.png", "volumeTest2.png"], main);
// sourceをID代わりにしてコンストラクタに指定
let tex0 = createStaticVolumeTexture("volumeTest0.png", 0, 0, 32);
let tex1 = createStaticVolumeTexture("volumeTest1.png", 0, 0, 32);
let tex2 = createStaticVolumeTexture("volumeTest2.png", 0, 0, 32);
function main() {
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
    const camera = initCamera(context);
    for (let i = 0; i < camera.volumeLayers.length; i++)
        document.body.appendChild(camera.volumeLayers[i].canvas);
    document.body.appendChild(camera.composition.canvas);
    let counter = 0;
    let start = performance.now();
    loop();
    function loop() {
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
        if (counter % 60 === 0)
            document.getElementById("fps").innerText = (counter * 1000 / (performance.now() - start));
        composit(camera);
        requestAnimationFrame(loop);
    }
}
