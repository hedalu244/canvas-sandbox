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
function texture(source, offsetX, offsetY) {
    return {
        draw: (x, y, context, resources) => {
            const img = resources.get(source);
            if (img === undefined) {
                console.log("not loaded yet");
                return;
            }
            context.drawImage(img, offsetX + x, offsetY + y);
        }
    };
}
// 使いたい画像を配列で指定してロードにかける。ロードが終わったときに呼ぶ関数を指定しとく。第三引数は以前のLoadingProgressに引き続きロードしたい時に使う。
let imageLoadingProgress = imageLoader(["texture.png", "bar.png"], () => { });
// sourceをID代わりにしてコンストラクタに指定
let tex0 = texture("texture.png", 0, 0);
function draw() {
    // HTMLにあるcanvasを持ってくる
    let canvas = document.getElementById("canvas");
    if (canvas === null || !(canvas instanceof HTMLCanvasElement))
        return;
    let context = canvas.getContext("2d");
    if (context === null)
        return;
    // こんな感じで呼び出す？
    tex0.draw(3, 5, context, imageLoadingProgress.loadedImage);
}
