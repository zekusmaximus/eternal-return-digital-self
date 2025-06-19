import{u as Q,j as V,b as d}from"./react-vendor-DaKsb8LL.js";import{u as ae,C as N,a as ee,j as g,B as te,M as ce,T as O,F as $}from"./three-vendor-rJ5vKMTC.js";import{s as le,a as ue,n as q,b as fe,c as de,v as me,d as ve,e as pe}from"./constellation-CzSJAdlk.js";const He=Q,ke=V,he=`
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
`,Se=`
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
`,U={LastHuman:new N("#ff6666"),Archaeologist:new N("#66ff66"),Algorithm:new N("#6666ff")},Pe=e=>{if(!e)return new N("#ffffff");if(e==="LastHuman")return U.LastHuman;if(e==="Archaeologist")return U.Archaeologist;if(e==="Algorithm")return U.Algorithm;const t=e.toLowerCase();return t.includes("human")?U.LastHuman:t.includes("arch")?U.Archaeologist:t.includes("algo")?U.Algorithm:(console.warn(`Unknown character type: ${e}, using default color`),new N("#ffffff"))},J=e=>e.contentSource==="arch-discovery.md"||e.contentSource==="algo-awakening.md"||e.contentSource==="human-discovery.md",ye=e=>e.contentSource==="arch-discovery.md"?"The Archaeologist":e.contentSource==="algo-awakening.md"?"The Algorithm":e.contentSource==="human-discovery.md"?"The Last Human":"",Ce=e=>e==="arch-discovery"?"Discovery":e==="algo-awakening"?"Awakening":e==="human-discovery"?"Choice":"",xe=(e,t,o,a,n,w,m,u,i)=>o?a.has(e.id):n?t:m?!u||u.includes(e.id):i===null?!0:w.some(c=>c.start===i&&c.end===e.id||c.start===e.id&&c.end===i),I=(e,t)=>{e(de(t.id)),e(me(t.id)),e(ve("reading")),e(pe({nodeId:t.id,character:t.character,temporalValue:t.temporalValue,attractors:t.strangeAttractors}))},Me=(e,t,o,a)=>{if(t){const u=1+Math.sin(o*3)*.15;e.scale.set(u,u,u)}else{const n=a?.5:1;(e.scale.x!==n||e.scale.y!==n||e.scale.z!==n)&&e.scale.set(n,n,n)}},K=(e,t)=>{e.forEach(o=>{var a;(a=o==null?void 0:o.uniforms)!=null&&a.time&&(o.uniforms.time.value=t)})},Ne=(e,t)=>{e.forEach(o=>{o&&o.visible&&o.lookAt(t.position)})},Ae=(e,t,o,a)=>{const n=new CustomEvent("node-hover",{detail:{position:{x:o,y:a-40},nodeId:e,isClickable:t}});window.dispatchEvent(n)},B=()=>{const e=new CustomEvent("node-unhover");window.dispatchEvent(e)},Le=d.forwardRef((e,t)=>{const{nodes:o,nodePositions:a,connections:n,overrideSelectedNodeId:w,onNodeClick:m,clickableNodeIds:u,isInitialChoicePhase:i,positionSynchronizer:c,triumvirateActive:f,triumvirateNodes:C}=e,P=Q(),{camera:x}=ae(),h=V(le),R=V(ue),p=w??R,T=d.useMemo(()=>new Set(C),[C]),E=d.useMemo(()=>({"arch-discovery":new N("#66ff66"),"algo-awakening":new N("#6666ff"),"human-discovery":new N("#ff6666")}),[]),F=d.useMemo(()=>{if(i||f)return T;if(!p)return new Set;const r=new Set;return n.forEach(s=>{s.start===p&&r.add(s.end),s.end===p&&r.add(s.start)}),r},[p,n,f,T,i]),[y,k]=d.useState({}),D=d.useRef([]),_=d.useRef([]),z=d.useRef([]),X=d.useRef([]),oe=d.useRef([]),Y=d.useRef([]),L=d.useRef({});d.useMemo(()=>{o.forEach(r=>{const s=a[r.id]||[0,0,0];L.current[r.id]=[...s]})},[o,a]);const ie=d.useRef(0),W=d.useRef(0),G=d.useRef(0),re=r=>{if(!(r-G.current>.05))return;G.current=r;const S=D.current.filter((b,M)=>{const v=o[M];return v&&(v.id===p||v.id===h||n.some(j=>j.start===v.id||j.end===v.id))});K(S,r);const A=_.current.filter((b,M)=>{const v=o[M];return v&&(v.id===p||v.id===h)});K(A,r)},ne=r=>{for(let s=0;s<o.length;s++){const S=o[s],A=z.current[s];if(!A||!L.current[S.id])continue;const b=i&&!e.isMinimap&&J(S);Me(A,b,r,e.isMinimap);const M=S.id===p||S.id===h||F.has(S.id);A.visible=!0,A.position.set(0,0,0);const v=X.current[s];v&&(v.visible=M,M&&v.position.set(0,0,0))}};return ee(r=>{const s=r.clock.elapsedTime;ie.current+=1;const S=c.updatePositions(s,e.isMinimap);re(s),s-W.current>=.15&&(W.current=s,ne(s),Ne(Y.current,x),k({...S}))}),g.jsxs("group",{children:[t&&g.jsx("instancedMesh",{ref:t,args:[new te,new ce,0],visible:!1}),o.map((r,s)=>{const S=p===r.id,A=F.has(r.id),b=h===r.id,M=J(r),v=i?ye(r):"",j=f&&C.includes(r.id)?Ce(r.id):"",Z=be(r,S,A,b,i,f,T,E),se=y[r.id]||L.current[r.id]||[0,0,0];return g.jsxs("group",{position:se,userData:{nodeId:r.id},children:[M&&i&&!f&&!e.isMinimap&&v&&g.jsx(O,{ref:l=>{l&&(oe.current[s]=l)},position:[0,2.2,0],fontSize:.4,color:"white",anchorX:"center",anchorY:"middle",outlineWidth:.03,outlineColor:"#000000","material-depthTest":!1,"material-transparent":!0,fontWeight:"bold",children:v}),f&&!e.isMinimap&&j&&g.jsx(O,{ref:l=>{l&&(Y.current[s]=l)},position:[0,2.2,0],fontSize:.6,color:"white",anchorX:"center",anchorY:"middle",outlineWidth:.05,outlineColor:"#000000","material-depthTest":!1,"material-transparent":!0,fontWeight:"bold",children:j}),(b||S)&&g.jsxs("mesh",{ref:l=>{l&&(X.current[s]=l)},position:[0,0,0],children:[g.jsx("sphereGeometry",{args:[1.4,16,16]}),g.jsx("shaderMaterial",{ref:l=>{l&&(_.current[s]=l)},vertexShader:we,fragmentShader:Se,uniforms:{color:{value:Z},time:{value:0}},transparent:!0,depthWrite:!1})]}),g.jsxs("mesh",{ref:l=>{l&&(z.current[s]=l)},position:[0,0,0],onClick:Te(r,M,i,P,m,u,p,n),onPointerOver:Re(r,M,e.isMinimap||!1,f,T,i,P,h,m,u,p,n),onPointerOut:l=>{e.isMinimap||(l.stopPropagation&&l.stopPropagation(),P(q()),B())},onPointerLeave:l=>{e.isMinimap||(l.stopPropagation&&l.stopPropagation(),P(q()),B())},children:[!S&&!b?g.jsx("octahedronGeometry",{args:[1,0]}):g.jsx("sphereGeometry",{args:[1,8,8]}),g.jsx("shaderMaterial",{ref:l=>{l&&(D.current[s]=l)},vertexShader:he,fragmentShader:ge,uniforms:{color:{value:Z},time:{value:0}},transparent:!0,depthWrite:!1})]})]},r.id)})]})}),be=(e,t,o,a,n,w,m,u)=>{const i=Pe(e.character).clone();if(n)if(m.has(e.id)){const c=u[e.id];c&&i.set(c)}else i.multiplyScalar(.2);else w?m.has(e.id)||i.multiplyScalar(.2):t?i.multiplyScalar(1.5):o?i.multiplyScalar(.5):a&&i.multiplyScalar(1.2);return i},Te=(e,t,o,a,n,w,m,u)=>i=>{if(i.stopPropagation&&i.stopPropagation(),B(),o){if(t)try{I(a,e)}catch(c){console.error("Navigation error:",c)}return}if(n){if(w&&!w.includes(e.id))return;n(e.id)}else(m===null||u&&u.some(f=>f.start===m&&f.end===e.id||f.start===e.id&&f.end===m))&&I(a,e)},Re=(e,t,o,a,n,w,m,u,i,c,f,C)=>P=>{if(!o&&(P.stopPropagation&&P.stopPropagation(),e.id!==u)){m(fe(e.id));const x=xe(e,t,a,n,w,C||[],i,c,f);Ae(e.id,x,P.clientX,P.clientY)}},H=new N,Ue=new N,Ie=e=>{const{connections:t,nodePositions:o,selectedNodeId:a,hoveredNodeId:n,positionSynchronizer:w,isMinimap:m}=e,u=d.useRef(null),i=d.useRef(null);return d.useEffect(()=>{const c=new te,f=new Float32Array(t.length*2*3),C=new Float32Array(t.length*2*3);return c.setAttribute("position",new $(f,3)),c.setAttribute("color",new $(C,3)),u.current&&(u.current.geometry=c),i.current=c,()=>{c.dispose()}},[t.length]),ee(c=>{if(!i.current)return;const f=i.current.attributes.position,C=i.current.attributes.color,P=m?o:w.updatePositions(c.clock.elapsedTime);for(let x=0;x<t.length;x++){const h=t[x],R=P[h.source],p=P[h.target];R&&p&&(f.setXYZ(x*2,R[0],R[1],R[2]),f.setXYZ(x*2+1,p[0],p[1],p[2]));const T=a===h.source||a===h.target,E=n===h.source||n===h.target,F=!T&&!E&&a&&(h.source===a||h.target===a);let y;if(T)y=H.set(49151);else if(E)y=H.set(8965375);else if(F){const k=.5+.5*Math.sin(c.clock.elapsedTime*5);y=Ue.set(4491519).lerp(H.set(16777215),k)}else y=H.set(16777215);C.setXYZ(x*2,y.r,y.g,y.b),C.setXYZ(x*2+1,y.r,y.g,y.b)}f.needsUpdate=!0,C.needsUpdate=!0}),g.jsx("lineSegments",{ref:u,children:g.jsx("lineBasicMaterial",{vertexColors:!0,toneMapped:!1,fog:!1})})};export{Ie as C,Le as N,ke as a,He as u};
//# sourceMappingURL=node-view-XdiLjT_l.js.map
