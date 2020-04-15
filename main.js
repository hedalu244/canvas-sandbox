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
    const vssource = `
  attribute vec3 position;
  attribute vec2 textureCoord;

  varying   vec2 vTextureCoord;

  void main(void){
    vTextureCoord = textureCoord;
    gl_Position   = vec4(position, 1.0);
  }`;
    const fssource = `precision mediump float;

  uniform sampler2D texture0;
  uniform sampler2D texture1;
  uniform sampler2D texture2;
  uniform sampler2D texture3;
  uniform sampler2D texture4;
  uniform sampler2D texture5;
  uniform sampler2D texture6;
  uniform sampler2D texture7;
  
  varying vec2      vTextureCoord;
  
  const vec2 direction = vec2(-3, -3) * 0.00390625;
  
  void main(void){
      float shadow = 
          0.5 < texture2D(texture7, vTextureCoord).a ? 0.0
          : 0.5 < texture2D(texture6, vTextureCoord).a ? 
              texture2D(texture7, vTextureCoord + direction).a
          : 0.5 < texture2D(texture5, vTextureCoord).a ? 
              max(texture2D(texture6, vTextureCoord + direction).a,
              texture2D(texture7, vTextureCoord + direction * 2.0).a)
          : 0.5 < texture2D(texture4, vTextureCoord).a ? 
              max(texture2D(texture5, vTextureCoord + direction).a,
              max(texture2D(texture6, vTextureCoord + direction * 2.0).a,
              texture2D(texture7, vTextureCoord + direction * 3.0).a ))
          : 0.5 < texture2D(texture3, vTextureCoord).a ? 
              max(texture2D(texture4, vTextureCoord + direction).a,
              max(texture2D(texture5, vTextureCoord + direction * 2.0).a,
              max(texture2D(texture6, vTextureCoord + direction * 3.0).a,
              texture2D(texture7, vTextureCoord + direction * 4.0).a )))
          : 0.5 < texture2D(texture2, vTextureCoord).a ? 
              max(texture2D(texture3, vTextureCoord + direction).a,
              max(texture2D(texture4, vTextureCoord + direction * 2.0).a,
              max(texture2D(texture5, vTextureCoord + direction * 3.0).a,
              max(texture2D(texture6, vTextureCoord + direction * 4.0).a,
              texture2D(texture7, vTextureCoord + direction * 5.0).a )))) : 1.0;
      gl_FragColor = mix(texture2D(texture0, vTextureCoord), texture2D(texture1, vTextureCoord), shadow);
  }`;
    const polygon = {
        position: [
            -1.0, 1.0,
            1.0, 1.0,
            -1.0, -1.0,
            1.0, -1.0,
        ],
        textureCoord: [
            (1 - compositW / layerW) / 2, (1 - compositH / layerH) / 2,
            (1 + compositW / layerW) / 2, (1 - compositH / layerH) / 2,
            (1 - compositW / layerW) / 2, (1 + compositH / layerH) / 2,
            (1 + compositW / layerW) / 2, (1 + compositH / layerH) / 2
        ],
        index: [
            0, 1, 2,
            3, 2, 1
        ]
    };
    const gl = createGlScreen(compositW, compositH);
    const prg = createProgram(createVertexShader(vssource), createFragmentShader(fssource));
    // VBOとIBOの登録
    setAttribute(createVbo(polygon.position), gl.getAttribLocation(prg, 'position'), 2);
    setAttribute(createVbo(polygon.textureCoord), gl.getAttribLocation(prg, 'textureCoord'), 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, createIbo(polygon.index));
    for (let i = 0; i < layerNum; i++)
        gl.uniform1i(gl.getUniformLocation(prg, 'texture' + i), i);
    for (let i = 0; i < layerNum; i++)
        document.body.appendChild(layers[i].canvas);
    document.body.appendChild(gl.canvas);
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
        // canvasを初期化
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const textures = [];
        for (let i = 0; i < layerNum; i++)
            textures[i] = attachImage(layers[i].canvas, i);
        gl.drawElements(gl.TRIANGLES, polygon.index.length, gl.UNSIGNED_SHORT, 0);
        textures.forEach(t => gl.deleteTexture(t));
        gl.flush();
        context.clearRect(0, 0, 400, 400);
        context.drawImage(gl.canvas, 0, 0, 400, 400);
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
    function createGlScreen(width, height) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        // webglコンテキストを取得
        const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (context === null || !(context instanceof WebGLRenderingContext))
            throw new Error("failed to get GL context");
        return context;
    }
    // VBOをバインドし登録する関数
    function setAttribute(vbo, location, attS) {
        // バッファをバインドする
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        // attributeLocationを有効にする
        gl.enableVertexAttribArray(location);
        // attributeLocationを通知し登録する
        gl.vertexAttribPointer(location, attS, gl.FLOAT, false, 0, 0);
    }
    // 頂点シェーダの生成
    function createVertexShader(source) {
        const vs = gl.createShader(gl.VERTEX_SHADER);
        if (vs === null)
            throw new Error("failed to create v-shader");
        gl.shaderSource(vs, source);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.log(gl.getShaderInfoLog(vs));
            throw new Error("failed to compile v-shader");
        }
        return vs;
    }
    function createFragmentShader(source) {
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        if (fs === null)
            throw new Error("failed to create f-shader");
        gl.shaderSource(fs, source);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.log(gl.getShaderInfoLog(fs));
            throw new Error("failed to compile f-shader");
        }
        return fs;
    }
    // プログラムオブジェクトの生成
    function createProgram(vs, fs) {
        const prg = gl.createProgram();
        if (prg === null)
            throw new Error("failed to create shader program");
        gl.attachShader(prg, vs);
        gl.attachShader(prg, fs);
        gl.linkProgram(prg);
        if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
            console.log(gl.getProgramInfoLog(prg));
            throw new Error("failed to link shader program");
        }
        gl.useProgram(prg);
        return prg;
    }
    // VBOを生成する関数
    function createVbo(data) {
        var vbo = gl.createBuffer();
        if (vbo === null)
            throw new Error("failed to create VBO");
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return vbo;
    }
    // IBOを生成する関数
    function createIbo(data) {
        var ibo = gl.createBuffer();
        if (ibo === null)
            throw new Error("failed to create IBO");
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        return ibo;
    }
    // テクスチャを生成する関数
    function attachImage(image, index) {
        const texture = gl.createTexture();
        if (texture === null)
            throw new Error("failed to create texture");
        gl.activeTexture(gl.TEXTURE0 + index);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        return texture;
    }
} //*/
