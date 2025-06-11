import{C,u as se,j as d,B as re,M as ae,T as ee,F as te}from"./three-vendor-B0HHzWfL.js";import{b as l,u as ce,j as ie}from"./react-vendor-DaKsb8LL.js";import{s as le,a as de,n as oe,b as ue,c as G,v as W,d as Z,e as O}from"./constellation-D77L-avc.js";const fe=`
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  
  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,me=`
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
`,ve=`
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
`,he=`
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
`,U={LastHuman:new C("#ff6666"),Archaeologist:new C("#66ff66"),Algorithm:new C("#6666ff")},pe=a=>{if(!a)return new C("#ffffff");if(a==="LastHuman")return U.LastHuman;if(a==="Archaeologist")return U.Archaeologist;if(a==="Algorithm")return U.Algorithm;const p=a.toLowerCase();return p.includes("human")?U.LastHuman:p.includes("arch")?U.Archaeologist:p.includes("algo")?U.Algorithm:(console.warn(`Unknown character type: ${a}, using default color`),new C("#ffffff"))},Ce=l.forwardRef((a,p)=>{const{nodes:M,nodePositions:N,connections:A,overrideSelectedNodeId:_,onNodeClick:j,clickableNodeIds:b,isInitialChoicePhase:u,positionSynchronizer:w,triumvirateActive:f,triumvirateNodes:x}=a,c=ce(),m=ie(le),P=ie(de),r=_??P,S=l.useMemo(()=>new Set(x),[x]),V=l.useMemo(()=>({"arch-discovery":new C("#66ff66"),"algo-awakening":new C("#6666ff"),"human-discovery":new C("#ff6666")}),[]),k=l.useMemo(()=>{if(u||f)return S;if(!r)return new Set;const e=new Set;return A.forEach(s=>{s.start===r&&e.add(s.end),s.end===r&&e.add(s.start)}),e},[r,A,f,S,u]),[B,g]=l.useState({}),L=l.useRef([]),$=l.useRef([]),q=l.useRef([]),D=l.useRef([]),X=l.useRef({});l.useMemo(()=>{M.forEach(e=>{const s=N[e.id]||[0,0,0];X.current[e.id]=[...s]})},[M,N]);const ne=l.useRef(0),J=l.useRef(0),K=l.useRef(0);return se(e=>{const s=e.clock.elapsedTime;ne.current+=1;const I=w.updatePositions(s,a.isMinimap);if(s-K.current>.05&&(K.current=s,L.current.filter((o,t)=>{const i=M[t];return i&&(i.id===r||i.id===m||A.some(y=>y.start===i.id||y.end===i.id))}).forEach(o=>{var t;(t=o==null?void 0:o.uniforms)!=null&&t.time&&(o.uniforms.time.value=s)}),$.current.filter((o,t)=>{const i=M[t];return i&&(i.id===r||i.id===m)}).forEach(o=>{var t;(t=o==null?void 0:o.uniforms)!=null&&t.time&&(o.uniforms.time.value=s)})),s-J.current>=.15){J.current=s;for(let v=0;v<M.length;v++){const n=M[v],o=q.current[v];if(!o||!X.current[n.id])continue;let i=!1;if(u&&!a.isMinimap&&(n.contentSource==="arch-discovery.md"||n.contentSource==="algo-awakening.md"||n.contentSource==="human-discovery.md")&&(i=!0),i){const Y=1+Math.sin(s*3)*.15;o.scale.set(Y,Y,Y)}else{const h=a.isMinimap?.5:1;(o.scale.x!==h||o.scale.y!==h||o.scale.z!==h)&&o.scale.set(h,h,h)}const y=n.id===r||n.id===m||k.has(n.id);o.visible=!0;const T=D.current[v];T&&(T.visible=y);{I[n.id]||console.warn(`NodesInstanced: Missing synchronized position for node ${n.id}`),o.position.set(0,0,0);const F=D.current[v];F&&y?(F.visible=!0,F.position.set(0,0,0)):F&&(F.visible=!1)}}g({...I})}}),d.jsxs("group",{children:[p&&d.jsx("instancedMesh",{ref:p,args:[new re,new ae,0],visible:!1}),M.map((e,s)=>{const I=r===e.id,Q=k.has(e.id),H=m===e.id;let E=!1,R="";u&&(e.contentSource==="arch-discovery.md"?(E=!0,R="The Archaeologist"):e.contentSource==="algo-awakening.md"?(E=!0,R="The Algorithm"):e.contentSource==="human-discovery.md"&&(E=!0,R="The Last Human"));let v="";f&&x.includes(e.id)&&(e.id==="arch-discovery"?v="Discovery":e.id==="algo-awakening"?v="Awakening":e.id==="human-discovery"&&(v="Choice"));const n=pe(e.character).clone();if(u)if(S.has(e.id)){const t=V[e.id];t&&n.set(t)}else n.multiplyScalar(.2);else f?S.has(e.id)||n.multiplyScalar(.2):I?n.multiplyScalar(1.5):Q?n.multiplyScalar(.5):H&&n.multiplyScalar(1.2);const o=B[e.id]||X.current[e.id]||[0,0,0];return d.jsxs("group",{position:o,userData:{nodeId:e.id},children:[E&&u&&!f&&!a.isMinimap&&R&&e.visitCount===0&&d.jsx(ee,{position:[0,2.2,0],fontSize:.4,color:"white",anchorX:"center",anchorY:"middle",outlineWidth:.03,outlineColor:"#000000","material-depthTest":!1,"material-transparent":!0,fontWeight:"bold",children:R}),"            ",f&&!a.isMinimap&&v&&d.jsx(ee,{position:[0,2.2,0],fontSize:.6,color:"white",anchorX:"center",anchorY:"middle",outlineWidth:.05,outlineColor:"#000000","material-depthTest":!1,"material-transparent":!0,fontWeight:"bold",children:v}),(H||I)&&d.jsxs("mesh",{ref:t=>{t&&(D.current[s]=t)},position:[0,0,0],children:[d.jsx("sphereGeometry",{args:[1.4,16,16]}),d.jsx("shaderMaterial",{ref:t=>{t&&($.current[s]=t)},vertexShader:ve,fragmentShader:he,uniforms:{color:{value:n},time:{value:0}},transparent:!0,depthWrite:!1})]}),d.jsxs("mesh",{ref:t=>{t&&(q.current[s]=t)},position:[0,0,0],onClick:t=>{t.stopPropagation&&t.stopPropagation();const i=new CustomEvent("node-unhover");if(window.dispatchEvent(i),u){if(E)try{c(G(e.id)),c(W(e.id)),c(Z("reading")),c(O({nodeId:e.id,character:e.character,temporalValue:e.temporalValue,attractors:e.strangeAttractors}))}catch(y){console.error("Navigation error:",y)}return}if(j){if(b&&!b.includes(e.id))return;j(e.id)}else r===null?(c(G(e.id)),c(W(e.id)),c(Z("reading")),c(O({nodeId:e.id,character:e.character,temporalValue:e.temporalValue,attractors:e.strangeAttractors}))):A.some(T=>T.start===r&&T.end===e.id||T.start===e.id&&T.end===r)&&(c(G(e.id)),c(W(e.id)),c(Z("reading")),c(O({nodeId:e.id,character:e.character,temporalValue:e.temporalValue,attractors:e.strangeAttractors})))},onPointerOver:t=>{if(!a.isMinimap&&(t.stopPropagation&&t.stopPropagation(),e.id!==m)){c(ue(e.id));let i=!1;f?i=S.has(e.id):u?i=E:j?i=!b||b.includes(e.id):r===null?i=!0:i=A.some(h=>h.start===r&&h.end===e.id||h.start===e.id&&h.end===r);const y=new CustomEvent("node-hover",{detail:{position:{x:t.clientX,y:t.clientY-40},nodeId:e.id,isClickable:i}});window.dispatchEvent(y)}},onPointerOut:t=>{if(a.isMinimap)return;t.stopPropagation&&t.stopPropagation(),c(oe());const i=new CustomEvent("node-unhover");window.dispatchEvent(i)},onPointerLeave:t=>{if(a.isMinimap)return;t.stopPropagation&&t.stopPropagation(),c(oe());const i=new CustomEvent("node-unhover");window.dispatchEvent(i)},children:[!I&&!H?d.jsx("octahedronGeometry",{args:[1,0]}):d.jsx("sphereGeometry",{args:[1,8,8]}),d.jsx("shaderMaterial",{ref:t=>{t&&(L.current[s]=t)},vertexShader:fe,fragmentShader:me,uniforms:{color:{value:n},time:{value:0}}})]})]},e.id)})]})}),z=new C,ge=new C,Me=a=>{const{connections:p,nodePositions:M,selectedNodeId:N,hoveredNodeId:A,positionSynchronizer:_,isMinimap:j}=a,b=l.useRef(null),u=l.useRef(null);return l.useEffect(()=>{const w=new re,f=new Float32Array(p.length*2*3),x=new Float32Array(p.length*2*3);return w.setAttribute("position",new te(f,3)),w.setAttribute("color",new te(x,3)),b.current&&(b.current.geometry=w),u.current=w,()=>{w.dispose()}},[p.length]),se(w=>{if(!u.current)return;const f=u.current.attributes.position,x=u.current.attributes.color,c=j?M:_.updatePositions(w.clock.elapsedTime);for(let m=0;m<p.length;m++){const P=p[m],r=c[P.source],S=c[P.target];r&&S&&(f.setXYZ(m*2,r[0],r[1],r[2]),f.setXYZ(m*2+1,S[0],S[1],S[2]));const V=N===P.source||N===P.target,k=A===P.source||A===P.target,B=!V&&!k&&N&&(P.source===N||P.target===N);let g;if(V)g=z.set(49151);else if(k)g=z.set(8965375);else if(B){const L=.5+.5*Math.sin(w.clock.elapsedTime*5);g=ge.set(4491519).lerp(z.set(16777215),L)}else g=z.set(16777215);x.setXYZ(m*2,g.r,g.g,g.b),x.setXYZ(m*2+1,g.r,g.g,g.b)}f.needsUpdate=!0,x.needsUpdate=!0}),d.jsx("lineSegments",{ref:b,children:d.jsx("lineBasicMaterial",{vertexColors:!0,toneMapped:!1,fog:!1})})};export{Me as C,Ce as N};
//# sourceMappingURL=node-view-CKzL31Pm.js.map
