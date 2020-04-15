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

/*
onload = function(){
  let vssource:string = `
  attribute vec3 position;
  attribute vec2 textureCoord;
  varying   vec2 vTextureCoord;

  void main(void){
    vTextureCoord = textureCoord;
    gl_Position   = vec4(position, 1.0);
  }`;
  let fssource:string = `
  precision mediump float;
  
  uniform sampler2D texture;
  varying vec2      vTextureCoord;
  
  void main(void){
      vec4 smpColor = texture2D(texture, vTextureCoord);
      gl_FragColor  = smpColor;
  }`;


  // canvasエレメントを取得
  var canvas = document.getElementById('canvas');
  if (canvas === null || !(canvas instanceof HTMLCanvasElement)) return;
  canvas.width = 500;
  canvas.height = 300;
  
  // webglコンテキストを取得
  const gl: WebGLRenderingContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (gl === null || !(gl instanceof WebGLRenderingContext)) return;
  
  // 頂点シェーダの生成
  const prg = program(vshader(vssource), fshader(fssource))

  // 頂点の位置
  var position = [
    -1.0,  1.0,
     1.0,  1.0,
    -1.0, -1.0,
     1.0, -1.0,
  ];
  // テクスチャ座標
  var textureCoord = [
    0.0, 0.0,
    1.0, 0.0,
    0.0, 1.0,
    1.0, 1.0
  ];
  
  // 頂点インデックス
  var index = [
    0, 1, 2,
    3, 2, 1
  ];

  var iIndex = ibo(index);
  
  // VBOとIBOの登録
  set_attribute(vbo(position), gl.getAttribLocation(prg, 'position'), 2);
  set_attribute(vbo(textureCoord), gl.getAttribLocation(prg, 'textureCoord'), 2);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iIndex);
  
  // uniformLocationを配列に取得
  var uniLocation = new Array();
  uniLocation[0]  = gl.getUniformLocation(prg, 'texture');
  
  // 有効にするテクスチャユニットを指定
  gl.activeTexture(gl.TEXTURE0);
  
  // テクスチャ用変数の宣言
  var tex = null;
  
  // テクスチャを生成
  texture('./texture.png');
  
  // カウンタの宣言
  var count = 0;
  
  // 恒常ループ
  function loop() {
      // canvasを初期化
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clearDepth(1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      
      // テクスチャをバインドする
      gl.bindTexture(gl.TEXTURE_2D, tex);
      
      // uniform変数にテクスチャを登録
      gl.uniform1i(uniLocation[0], 0);
      
      // uniform変数の登録と描画
      gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
      
      // コンテキストの再描画
      gl.flush();
      
      // ループのために再帰呼び出し
      requestAnimationFrame(loop);
    }
  loop();
  

  // VBOをバインドし登録する関数
  function set_attribute(vbo: WebGLBuffer, attL: number, attS: number){
    // バッファをバインドする
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);    
    // attributeLocationを有効にする
    gl.enableVertexAttribArray(attL);
    // attributeLocationを通知し登録する
    gl.vertexAttribPointer(attL, attS, gl.FLOAT, false, 0, 0);
  }

  // 頂点シェーダの生成
  function vshader(source: string): WebGLShader {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (vs === null) throw new Error("failed to create v-shader");
    gl.shaderSource(vs, source);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.log(gl.getShaderInfoLog(vs));
      throw new Error("failed to compile v-shader");
    }
    return vs;
  }
  function fshader(source: string): WebGLShader {
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (fs === null) throw new Error("failed to create f-shader");
    gl.shaderSource(fs, source);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.log(gl.getShaderInfoLog(fs))
      throw new Error("failed to compile f-shader");
    }
    return fs;
  } 

  // プログラムオブジェクトの生成
  function program(vs: WebGLShader, fs: WebGLShader): WebGLProgram {
    const prg = gl.createProgram();
    if (prg === null) throw new Error("failed to create shader program");
    gl.attachShader(prg, vs);
    gl.attachShader(prg, fs);
    gl.linkProgram(prg);      
    if(!gl.getProgramParameter(prg, gl.LINK_STATUS)){
      console.log(gl.getProgramInfoLog(prg));
      throw new Error("failed to link shader program");
    }
    gl.useProgram(prg);
    return prg;
  }

  // VBOを生成する関数
  function vbo(data: number[]): WebGLBuffer{
      var vbo = gl.createBuffer();
      if (vbo === null) throw new Error("failed to create VBO");
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      return vbo;
  }
  
  // IBOを生成する関数
  function ibo(data: number[]): WebGLBuffer {
      var ibo = gl.createBuffer();
      if (ibo === null) throw new Error("failed to create IBO");
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      return ibo;
  }
  
  // テクスチャを生成する関数
  function texture(source: string){
      // イメージオブジェクトの生成
      var img = new Image();

      // データのオンロードをトリガーにする
      img.onload = function(){
          // テクスチャオブジェクトの生成
          tex = gl.createTexture();
          
          // テクスチャをバインドする
          gl.bindTexture(gl.TEXTURE_2D, tex);
          
          // テクスチャへイメージを適用
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          
          // ミップマップを生成
          gl.generateMipmap(gl.TEXTURE_2D);
          
          // テクスチャのバインドを無効化
          gl.bindTexture(gl.TEXTURE_2D, null);
      };
      
      // イメージオブジェクトのソースを指定
      img.src = source;
  }
  
};*/

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

interface Texture {
  // これの実装を色々にしてアニメーションなどを表現する
  draw: (x:number, y:number, context:CanvasRenderingContext2D, resources:ImageResources) => void;
}

// ただの（アニメーションしない）テクスチャを作る
function texture(source: string, offsetX: number, offsetY: number): Texture{
  return {
    draw: (x:number, y:number, context:CanvasRenderingContext2D, resources:ImageResources) => {
      const img = resources.get(source);
      if (img === undefined) { console.log("not loaded yet"); return; }
      context.drawImage(img, offsetX + x, offsetY + y)
    }
  }
}

// 使いたい画像を配列で指定してロードにかける。ロードが終わったときに呼ぶ関数を指定しとく。第三引数は以前のLoadingProgressに引き続きロードしたい時に使う。
let imageLoadingProgress = imageLoader(["texture.png", "bar.png"], () => { /* ゲーム開始処理 */});

// sourceをID代わりにしてコンストラクタに指定
let tex0 = texture("texture.png", 0, 0);

function draw() {
  // HTMLにあるcanvasを持ってくる
  let canvas = document.getElementById("canvas");
  if (canvas === null || !(canvas instanceof HTMLCanvasElement)) return;
  let context = canvas.getContext("2d");
  if (context === null) return;
  
  // こんな感じで呼び出す？
  tex0.draw(3, 5, context, imageLoadingProgress.loadedImage);
}