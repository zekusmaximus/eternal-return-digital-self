import{u as ae,j as $,b as a}from"./react-vendor-DaKsb8LL.js";import{u as de,C,a as ce,j as f,B as le,M as fe,T as se,F as re}from"./three-vendor-rJ5vKMTC.js";import{s as me,a as ve,n as ne,b as pe,c as W,v as G,d as Z,e as O}from"./constellation-D8AaAQ1t.js";const be=ae,Ne=$,he=`
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  
  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,ge=`
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
`,we=`
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
`,Pe=`
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
`,j={LastHuman:new C("#ff6666"),Archaeologist:new C("#66ff66"),Algorithm:new C("#6666ff")},Se=c=>{if(!c)return new C("#ffffff");if(c==="LastHuman")return j.LastHuman;if(c==="Archaeologist")return j.Archaeologist;if(c==="Algorithm")return j.Algorithm;const h=c.toLowerCase();return h.includes("human")?j.LastHuman:h.includes("arch")?j.Archaeologist:h.includes("algo")?j.Algorithm:(console.warn(`Unknown character type: ${c}, using default color`),new C("#ffffff"))},Te=a.forwardRef((c,h)=>{const{nodes:w,nodePositions:x,connections:A,overrideSelectedNodeId:D,onNodeClick:k,clickableNodeIds:b,isInitialChoicePhase:m,positionSynchronizer:P,triumvirateActive:v,triumvirateNodes:M}=c,l=ae(),{camera:S}=de(),d=$(me),E=$(ve),n=D??E,N=a.useMemo(()=>new Set(M),[M]),V=a.useMemo(()=>({"arch-discovery":new C("#66ff66"),"algo-awakening":new C("#6666ff"),"human-discovery":new C("#ff6666")}),[]),L=a.useMemo(()=>{if(m||v)return N;if(!n)return new Set;const e=new Set;return A.forEach(r=>{r.start===n&&e.add(r.end),r.end===n&&e.add(r.start)}),e},[n,A,v,N,m]),[g,_]=a.useState({}),q=a.useRef([]),J=a.useRef([]),K=a.useRef([]),B=a.useRef([]),Q=a.useRef([]),ee=a.useRef([]),X=a.useRef({});a.useMemo(()=>{w.forEach(e=>{const r=x[e.id]||[0,0,0];X.current[e.id]=[...r]})},[w,x]);const ue=a.useRef(0),te=a.useRef(0),oe=a.useRef(0);return ce(e=>{const r=e.clock.elapsedTime;ue.current+=1;const I=P.updatePositions(r,c.isMinimap);if(r-oe.current>.05&&(oe.current=r,q.current.filter((o,t)=>{const i=w[t];return i&&(i.id===n||i.id===d||A.some(y=>y.start===i.id||y.end===i.id))}).forEach(o=>{var t;(t=o==null?void 0:o.uniforms)!=null&&t.time&&(o.uniforms.time.value=r)}),J.current.filter((o,t)=>{const i=w[t];return i&&(i.id===n||i.id===d)}).forEach(o=>{var t;(t=o==null?void 0:o.uniforms)!=null&&t.time&&(o.uniforms.time.value=r)})),r-te.current>=.15){te.current=r;for(let u=0;u<w.length;u++){const s=w[u],o=K.current[u];if(!o||!X.current[s.id])continue;let i=!1;if(m&&!c.isMinimap&&(s.contentSource==="arch-discovery.md"||s.contentSource==="algo-awakening.md"||s.contentSource==="human-discovery.md")&&(i=!0),i){const Y=1+Math.sin(r*3)*.15;o.scale.set(Y,Y,Y)}else{const p=c.isMinimap?.5:1;(o.scale.x!==p||o.scale.y!==p||o.scale.z!==p)&&o.scale.set(p,p,p)}const y=s.id===n||s.id===d||L.has(s.id);o.visible=!0;const T=B.current[u];T&&(T.visible=y);{I[s.id]||console.warn(`NodesInstanced: Missing synchronized position for node ${s.id}`),o.position.set(0,0,0);const U=B.current[u];U&&y?(U.visible=!0,U.position.set(0,0,0)):U&&(U.visible=!1)}}for(let u=0;u<w.length;u++){const s=Q.current[u],o=ee.current[u];s&&s.visible&&s.lookAt(S.position),o&&o.visible&&o.lookAt(S.position)}_({...I})}}),f.jsxs("group",{children:[h&&f.jsx("instancedMesh",{ref:h,args:[new le,new fe,0],visible:!1}),w.map((e,r)=>{const I=n===e.id,ie=L.has(e.id),H=d===e.id;let R=!1,F="";m&&(e.contentSource==="arch-discovery.md"?(R=!0,F="The Archaeologist"):e.contentSource==="algo-awakening.md"?(R=!0,F="The Algorithm"):e.contentSource==="human-discovery.md"&&(R=!0,F="The Last Human"));let u="";v&&M.includes(e.id)&&(e.id==="arch-discovery"?u="Discovery":e.id==="algo-awakening"?u="Awakening":e.id==="human-discovery"&&(u="Choice"));const s=Se(e.character).clone();if(m)if(N.has(e.id)){const t=V[e.id];t&&s.set(t)}else s.multiplyScalar(.2);else v?N.has(e.id)||s.multiplyScalar(.2):I?s.multiplyScalar(1.5):ie?s.multiplyScalar(.5):H&&s.multiplyScalar(1.2);const o=g[e.id]||X.current[e.id]||[0,0,0];return f.jsxs("group",{position:o,userData:{nodeId:e.id},children:[R&&m&&!v&&!c.isMinimap&&F&&f.jsx(se,{ref:t=>{t&&(Q.current[r]=t)},position:[0,2.2,0],fontSize:.4,color:"white",anchorX:"center",anchorY:"middle",outlineWidth:.03,outlineColor:"#000000","material-depthTest":!1,"material-transparent":!0,fontWeight:"bold",children:F}),v&&!c.isMinimap&&u&&f.jsx(se,{ref:t=>{t&&(ee.current[r]=t)},position:[0,2.2,0],fontSize:.6,color:"white",anchorX:"center",anchorY:"middle",outlineWidth:.05,outlineColor:"#000000","material-depthTest":!1,"material-transparent":!0,fontWeight:"bold",children:u}),(H||I)&&f.jsxs("mesh",{ref:t=>{t&&(B.current[r]=t)},position:[0,0,0],children:[f.jsx("sphereGeometry",{args:[1.4,16,16]}),f.jsx("shaderMaterial",{ref:t=>{t&&(J.current[r]=t)},vertexShader:we,fragmentShader:Pe,uniforms:{color:{value:s},time:{value:0}},transparent:!0,depthWrite:!1})]}),f.jsxs("mesh",{ref:t=>{t&&(K.current[r]=t)},position:[0,0,0],onClick:t=>{t.stopPropagation&&t.stopPropagation();const i=new CustomEvent("node-unhover");if(window.dispatchEvent(i),m){if(R)try{l(W(e.id)),l(G(e.id)),l(Z("reading")),l(O({nodeId:e.id,character:e.character,temporalValue:e.temporalValue,attractors:e.strangeAttractors}))}catch(y){console.error("Navigation error:",y)}return}if(k){if(b&&!b.includes(e.id))return;k(e.id)}else n===null?(l(W(e.id)),l(G(e.id)),l(Z("reading")),l(O({nodeId:e.id,character:e.character,temporalValue:e.temporalValue,attractors:e.strangeAttractors}))):A.some(T=>T.start===n&&T.end===e.id||T.start===e.id&&T.end===n)&&(l(W(e.id)),l(G(e.id)),l(Z("reading")),l(O({nodeId:e.id,character:e.character,temporalValue:e.temporalValue,attractors:e.strangeAttractors})))},onPointerOver:t=>{if(!c.isMinimap&&(t.stopPropagation&&t.stopPropagation(),e.id!==d)){l(pe(e.id));let i=!1;v?i=N.has(e.id):m?i=R:k?i=!b||b.includes(e.id):n===null?i=!0:i=A.some(p=>p.start===n&&p.end===e.id||p.start===e.id&&p.end===n);const y=new CustomEvent("node-hover",{detail:{position:{x:t.clientX,y:t.clientY-40},nodeId:e.id,isClickable:i}});window.dispatchEvent(y)}},onPointerOut:t=>{if(c.isMinimap)return;t.stopPropagation&&t.stopPropagation(),l(ne());const i=new CustomEvent("node-unhover");window.dispatchEvent(i)},onPointerLeave:t=>{if(c.isMinimap)return;t.stopPropagation&&t.stopPropagation(),l(ne());const i=new CustomEvent("node-unhover");window.dispatchEvent(i)},children:[!I&&!H?f.jsx("octahedronGeometry",{args:[1,0]}):f.jsx("sphereGeometry",{args:[1,8,8]}),f.jsx("shaderMaterial",{ref:t=>{t&&(q.current[r]=t)},vertexShader:he,fragmentShader:ge,uniforms:{color:{value:s},time:{value:0}},transparent:!0,depthWrite:!1})]})]},e.id)})]})}),z=new C,ye=new C,Re=c=>{const{connections:h,nodePositions:w,selectedNodeId:x,hoveredNodeId:A,positionSynchronizer:D,isMinimap:k}=c,b=a.useRef(null),m=a.useRef(null);return a.useEffect(()=>{const P=new le,v=new Float32Array(h.length*2*3),M=new Float32Array(h.length*2*3);return P.setAttribute("position",new re(v,3)),P.setAttribute("color",new re(M,3)),b.current&&(b.current.geometry=P),m.current=P,()=>{P.dispose()}},[h.length]),ce(P=>{if(!m.current)return;const v=m.current.attributes.position,M=m.current.attributes.color,l=k?w:D.updatePositions(P.clock.elapsedTime);for(let S=0;S<h.length;S++){const d=h[S],E=l[d.source],n=l[d.target];E&&n&&(v.setXYZ(S*2,E[0],E[1],E[2]),v.setXYZ(S*2+1,n[0],n[1],n[2]));const N=x===d.source||x===d.target,V=A===d.source||A===d.target,L=!N&&!V&&x&&(d.source===x||d.target===x);let g;if(N)g=z.set(49151);else if(V)g=z.set(8965375);else if(L){const _=.5+.5*Math.sin(P.clock.elapsedTime*5);g=ye.set(4491519).lerp(z.set(16777215),_)}else g=z.set(16777215);M.setXYZ(S*2,g.r,g.g,g.b),M.setXYZ(S*2+1,g.r,g.g,g.b)}v.needsUpdate=!0,M.needsUpdate=!0}),f.jsx("lineSegments",{ref:b,children:f.jsx("lineBasicMaterial",{vertexColors:!0,toneMapped:!1,fog:!1})})};export{Re as C,Te as N,Ne as a,be as u};
//# sourceMappingURL=node-view-GFMNrUCl.js.map
