precision mediump float;

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
  }