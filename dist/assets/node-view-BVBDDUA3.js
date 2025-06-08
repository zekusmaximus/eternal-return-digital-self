var ne=Object.defineProperty;var re=(f,r,n)=>r in f?ne(f,r,{enumerable:!0,configurable:!0,writable:!0,value:n}):f[r]=n;var j=(f,r,n)=>re(f,typeof r!="symbol"?r+"":r,n);import{u as se,a as ee,j as M,B as ae,M as ce,F as le,b as ue,C as U,V as de,c as z,S as fe,D as me}from"./three-vendor-CMUj8LmA.js";import{b as c,u as he,c as q,e as ve}from"./react-vendor-CLXXY-Bz.js";import{s as pe,a as ge,n as D,b as we,c as K,v as $,d as G,e as W,u as J}from"./constellation-9EXX-9rV.js";const H=(()=>{const u=new Float32Array(256);for(let b=0;b<256;b++)u[b]=Math.sin(b/256*Math.PI*2);const w=b=>{const a=Math.floor(b%(Math.PI*2)/(Math.PI*2)*256)&255;return u[a]};return(b,a,R,i)=>w(b*.3+i*.7)*.3+w(a*.5+i*.3)*.3+w(R*.2+i*.5)*.3})(),be=`
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  
  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,Pe=`
  uniform vec3 color;
  uniform float time;
  
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  
  // Simple hash function
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  void main() {
    // Basic circuit pattern
    vec2 gridPos = floor(vPosition.xy * 10.0);
    float circuit = hash(gridPos) > 0.7 ? 1.0 : 0.0;
    
    // Circuit lines
    vec2 grid = fract(vPosition.xy * 10.0);
    float line = smoothstep(0.95, 0.98, max(grid.x, grid.y));
    
    // Flowing effect on circuit lines
    float flow = sin(vPosition.x * 5.0 + vPosition.y * 3.0 + time * 2.0) * 0.5 + 0.5;
    
    // Combine effects
    vec3 finalColor = color * (0.5 + 0.5 * circuit + line * flow);
    
    // Add rim lighting
    float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
    rim = pow(rim, 3.0);
    finalColor += color * rim * 0.5;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`,Ce=`
  uniform float time;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    
    // Add subtle pulsating effect
    float pulse = sin(time * 2.0) * 0.05 + 1.05;
    vec3 newPosition = position * pulse;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`,ye=`
  uniform vec3 color;
  uniform float time;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  void main() {
    // Create flowing wave pattern
    float wave = sin(vPosition.x * 5.0 + vPosition.y * 3.0 + time * 2.0) * 0.5 + 0.5;
    
    // Rim effect for sphere edge glow
    float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
    rim = pow(rim, 3.0);
    
    // Transparency based on rim and wave pattern
    float alpha = rim * 0.7 * wave;
    
    // Final color with slight pulsation
    float pulse = sin(time * 3.0) * 0.2 + 0.8;
    vec3 finalColor = color * pulse * (0.5 + wave * 0.5);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`,_={LastHuman:new U("#ff6666"),Archaeologist:new U("#66ff66"),Algorithm:new U("#6666ff")},xe=f=>{if(!f)return new U("#ffffff");if(f==="LastHuman")return _.LastHuman;if(f==="Archaeologist")return _.Archaeologist;if(f==="Algorithm")return _.Algorithm;const r=f.toLowerCase();return r.includes("human")?_.LastHuman:r.includes("arch")?_.Archaeologist:r.includes("algo")?_.Algorithm:(console.warn(`Unknown character type: ${f}, using default color`),new U("#ffffff"))};class Q{constructor(r){j(this,"frustum");j(this,"matrix");j(this,"camera");j(this,"visibleNodes");j(this,"distanceThresholds");j(this,"lastUpdateTime");j(this,"updateInterval");this.frustum=new le,this.matrix=new ue,this.camera=r,this.visibleNodes=new Set,this.distanceThresholds={high:60,medium:90,low:120},this.lastUpdateTime=0,this.updateInterval=150}updateFrustum(){this.matrix.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse),this.frustum.setFromProjectionMatrix(this.matrix)}shouldUpdate(r){return r-this.lastUpdateTime>this.updateInterval?(this.lastUpdateTime=r,!0):!1}checkNodeVisibility(r,n){this.visibleNodes.has(r);const h=n.distanceTo(this.camera.position);this.visibleNodes.add(r);let v;return h<=this.distanceThresholds.high?v="high":h<=this.distanceThresholds.medium?v="medium":h<=this.distanceThresholds.low?v="low":v="culled",this.visibleNodes.add(r),{isVisible:!0,detailLevel:v}}getVisibleNodeCount(){return this.visibleNodes.size}}const Fe=c.forwardRef((f,r)=>{const{nodes:n,nodePositions:h,connections:v,overrideSelectedNodeId:P,onNodeClick:I,clickableNodeIds:L}=f,u=he(),w=q(pe),b=q(ge),a=P??b,{camera:R}=se(),i=c.useRef(null),N=c.useRef({count:0}),y=c.useMemo(()=>{if(!a)return new Set;const o=new Set;return v.forEach(s=>{s.start===a&&o.add(s.end),s.end===a&&o.add(s.start)}),o},[a,v]),p=c.useRef([]),F=c.useRef([]),E=c.useRef([]),A=c.useRef([]),x=c.useRef({});c.useMemo(()=>{n.forEach(o=>{const s=h[o.id]||[0,0,0];x.current[o.id]=[...s]})},[n,h]),c.useEffect(()=>{i.current||(i.current=new Q(R))},[R]);const l=c.useRef(0),T=c.useRef(0),V=c.useRef(0);return ee(o=>{const s=o.clock.elapsedTime;if(l.current+=1,i.current||(i.current=new Q(R)),i.current.shouldUpdate(s)&&(i.current.updateFrustum(),N.current.count++,N.current.count%6===0)){console.log("Performing visibility validation check...");let g=0;n.forEach(d=>{const e=E.current[n.indexOf(d)];if(e){const t=d.id===a||d.id===w||y.has(d.id);e.visible===!1&&t&&(console.log(`Forcing visibility for important node: ${d.id}`),e.visible=!0),e.visible&&g++}}),console.log(`Visible nodes: ${g} / ${n.length}`),g<n.length*.7&&(console.warn("Too few nodes visible, forcing all nodes to be visible"),n.forEach((d,e)=>{const t=E.current[e];t&&(t.visible=!0)}))}if(s-V.current>.05&&(V.current=s,p.current.filter((e,t)=>{const S=n[t];return S&&(S.id===a||S.id===w||v.some(C=>C.start===S.id||C.end===S.id))}).forEach(e=>{var t;(t=e==null?void 0:e.uniforms)!=null&&t.time&&(e.uniforms.time.value=s)}),F.current.filter((e,t)=>{const S=n[t];return S&&(S.id===a||S.id===w)}).forEach(e=>{var t;(t=e==null?void 0:e.uniforms)!=null&&t.time&&(e.uniforms.time.value=s)})),s-T.current>.1){T.current=s;for(let g=0;g<n.length;g++){const d=n[g],e=E.current[g];if(!e)continue;const t=x.current[d.id];if(!t)continue;const S=new de(t[0],t[1],t[2]),{detailLevel:C}=i.current.checkNodeVisibility(d.id,S),Z=d.id===a||d.id===w||y.has(d.id);e.visible=!0;const Y=A.current[g];Y&&(Y.visible=Z);let O=.03;switch(C){case"high":O=.03;break;case"medium":O=.02;break;case"low":O=.01;break}if(Z&&(O=.03),Z||C==="high"||C==="medium"&&l.current%2===0||C==="low"&&l.current%3===0){const te=H(t[0],t[1],t[2],s*.3),oe=H(t[0]+100,t[1]+100,t[2]+100,s*.25),ie=H(t[0]+200,t[1]+200,t[2]+200,s*.2);e.position.set(t[0]+te*O,t[1]+oe*O,t[2]+ie*O),e.matrixAutoUpdate=!0;const B=A.current[g];B&&(Z||C==="high")?(B.visible=Z,B.position.copy(e.position)):B&&(B.visible=!1)}}}}),M.jsxs("group",{children:[r&&M.jsx("instancedMesh",{ref:r,args:[new ae,new ce,0],visible:!1}),n.map((o,s)=>{const m=h[o.id]||[0,0,0],k=a===o.id,X=y.has(o.id),g=w===o.id,d=xe(o.character).clone();return k?d.multiplyScalar(1.5):X?d.multiplyScalar(.5):g&&d.multiplyScalar(1.2),M.jsxs("group",{children:[(g||k)&&M.jsxs("mesh",{ref:e=>{e&&(A.current[s]=e)},position:[m[0],m[1],m[2]],children:[M.jsx("sphereGeometry",{args:[.7,16,16]}),M.jsx("shaderMaterial",{ref:e=>{e&&(F.current[s]=e)},vertexShader:Ce,fragmentShader:ye,uniforms:{color:{value:d},time:{value:0}},transparent:!0,depthWrite:!1})]}),M.jsxs("mesh",{ref:e=>{e&&(E.current[s]=e)},position:[m[0],m[1],m[2]],onClick:e=>{e.stopPropagation();const t=new CustomEvent("node-unhover");if(window.dispatchEvent(t),I){if(L&&!L.includes(o.id))return;I(o.id)}else{if(a===null){u(K(o.id)),u($(o.id)),u(G("reading")),u(W({nodeId:o.id,character:o.character,temporalValue:o.temporalValue,attractors:o.strangeAttractors}));return}v.some(C=>C.start===a&&C.end===o.id||C.start===o.id&&C.end===a)&&(u(K(o.id)),u($(o.id)),u(G("reading")),u(W({nodeId:o.id,character:o.character,temporalValue:o.temporalValue,attractors:o.strangeAttractors})))}},onPointerOver:e=>{if(e.stopPropagation(),o.id!==w){u(we(o.id));const t=new CustomEvent("node-hover",{detail:{position:{x:e.clientX,y:e.clientY-40},nodeId:o.id}});window.dispatchEvent(t)}},onPointerOut:e=>{e.stopPropagation(),u(D());const t=new CustomEvent("node-unhover");window.dispatchEvent(t)},onPointerLeave:e=>{e.stopPropagation(),u(D());const t=new CustomEvent("node-unhover");window.dispatchEvent(t)},children:[!k&&!g?M.jsx("octahedronGeometry",{args:[.5,0]}):M.jsx("sphereGeometry",{args:[.5,8,8]}),M.jsx("shaderMaterial",{ref:e=>{e&&(p.current[s]=e)},vertexShader:be,fragmentShader:Pe,uniforms:{color:{value:d},time:{value:0}}})]})]},o.id)})]})}),Se=`
  // Using the built-in 'color' attribute instead of redefining it
  uniform float time;
  varying vec3 vColor;
  varying float vPosition;
  
  void main() {
    vColor = color;
    vPosition = position.y;
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;
  }
`,Me=`
  uniform float time;
  varying vec3 vColor;
  varying float vPosition;
  
  void main() {
    // Create flowing effect along the connection
    float flow = sin(vPosition * 10.0 + time * 3.0) * 0.5 + 0.5;
    
    // Create pulsating glow effect
    float pulse = sin(time * 2.0) * 0.2 + 0.8;
    
    // Combine effects
    vec3 finalColor = vColor * (1.0 + flow * 0.3) * pulse;
    
    // Add subtle variation based on time
    finalColor += vec3(sin(time * 0.2) * 0.05, sin(time * 0.3) * 0.05, sin(time * 0.4) * 0.05);
    
    gl_FragColor = vec4(finalColor, 0.9);
  }
`,Ae=c.forwardRef((f,r)=>{const{connections:n,nodePositions:h}=f;console.log("ConnectionsBatched rendering with:",{connectionCount:n.length,nodePositionsCount:Object.keys(h).length});const v=c.useRef(null);ve.useImperativeHandle(r,()=>null);const P=c.useRef(null),I=J(i=>i.interface.selectedNodeId),L=c.useRef(null),u=J(i=>i.interface.hoveredNodeId),{positions:w,colors:b,lineCount:a}=c.useMemo(()=>{const i=new Float32Array(n.length*2*3),N=new Float32Array(n.length*2*3);let y=0;for(const p of n){const F=h[p.source],E=h[p.target];if(F&&E){i.set(F,y*6),i.set(E,y*6+3);const A=I===p.source||I===p.target,x=u===p.source||u===p.target;let l;A?l=new U(49151):x?l=new U(8965375):l=new U(4473924),N.set([l.r,l.g,l.b],y*6),N.set([l.r,l.g,l.b],y*6+3),y++}}return{positions:i,colors:N,lineCount:y}},[n,h,I,u]);c.useEffect(()=>{console.log("ConnectionsBatched initializing geometry with:",{lineCount:a,positionsLength:w.length,colorsLength:b.length});const i=P.current;if(!i){console.warn("ConnectionsBatched: geometryRef.current is null");return}try{i.setAttribute("position",new z(w,3)),i.setAttribute("color",new z(b,3)),i.setDrawRange(0,a*2),i.attributes.position.needsUpdate=!0,i.attributes.color.needsUpdate=!0,console.log("ConnectionsBatched: Successfully initialized geometry attributes")}catch(N){console.error("Error initializing geometry attributes:",N)}},[w,b,a]);const R=c.useRef(0);return ee(i=>{if(R.current+=1,!P.current||(L.current&&(L.current.uniforms.time.value=i.clock.elapsedTime),!P.current.attributes.position||!P.current.attributes.color))return;const N=R.current%2===0,y=R.current%3===0;try{const p=P.current.attributes.position,F=P.current.attributes.color;let E=!1,A=!1;for(let x=0;x<n.length;x++){const l=n[x],T=h[l.source],V=h[l.target];if(!T||!V){console.warn(`ConnectionsBatched: Missing position for connection ${l.source} -> ${l.target}`);continue}N&&(p.setXYZ(x*2,T[0],T[1],T[2]),p.setXYZ(x*2+1,V[0],V[1],V[2]),E=!0);const o=I===l.source||I===l.target,s=u===l.source||u===l.target;if(o||s||y){let m;if(o){const k=Math.sin(i.clock.elapsedTime*2)*.1+.9;m=new U(49151).multiplyScalar(k)}else s?m=new U(8965375):m=new U(4473924);F.setXYZ(x*2,m.r,m.g,m.b),F.setXYZ(x*2+1,m.r,m.g,m.b),A=!0}}E&&(p.needsUpdate=!0),A&&(F.needsUpdate=!0)}catch(p){console.error("Error updating connection positions and colors:",p)}}),c.useEffect(()=>{if(P.current){const i=new fe({uniforms:{time:{value:0}},vertexShader:Se,fragmentShader:Me,vertexColors:!0,transparent:!0,side:me,depthWrite:!1});v.current&&(v.current.material=i,L.current=i)}},[]),c.useEffect(()=>{P.current&&a>0&&P.current.setDrawRange(0,a*2)},[a]),M.jsx("lineSegments",{ref:v,frustumCulled:!1,children:M.jsx("bufferGeometry",{ref:P})})});export{Ae as C,Fe as N};
//# sourceMappingURL=node-view-BVBDDUA3.js.map
