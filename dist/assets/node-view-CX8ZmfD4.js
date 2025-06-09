import{u as K,j as N,B as Q,M as ee,T as te,C as R,V as X,F as W,S as oe,D as ie}from"./three-vendor-BSwpqFLI.js";import{b as d,u as re,j as q,R as ne}from"./react-vendor-DaKsb8LL.js";import{s as se,a as ae,n as J,b as ce,c as $,v as G,d as Z,e as O}from"./constellation-DYOcMIlB.js";const le=`
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  
  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,de=`
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
`,ue=`
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
`,fe=`
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
`,L={LastHuman:new R("#ff6666"),Archaeologist:new R("#66ff66"),Algorithm:new R("#6666ff")},me=S=>{if(!S)return new R("#ffffff");if(S==="LastHuman")return L.LastHuman;if(S==="Archaeologist")return L.Archaeologist;if(S==="Algorithm")return L.Algorithm;const I=S.toLowerCase();return I.includes("human")?L.LastHuman:I.includes("arch")?L.Archaeologist:I.includes("algo")?L.Algorithm:(console.warn(`Unknown character type: ${S}, using default color`),new R("#ffffff"))},ye=d.forwardRef((S,I)=>{const{nodes:w,nodePositions:z,connections:U,overrideSelectedNodeId:F,onNodeClick:B,clickableNodeIds:T,isInitialChoicePhase:u,positionSynchronizer:k}=S,s=re(),E=q(se),j=q(ae),P=F??j,_=d.useMemo(()=>{if(!P)return new Set;const e=new Set;return U.forEach(i=>{i.start===P&&e.add(i.end),i.end===P&&e.add(i.start)}),e},[P,U]),r=d.useRef([]),x=d.useRef([]),p=d.useRef([]),m=d.useRef([]),v=d.useRef({});d.useMemo(()=>{w.forEach(e=>{const i=z[e.id]||[0,0,0];v.current[e.id]=[...i]})},[w,z]);const y=d.useRef(0),f=d.useRef(0),g=d.useRef(0);return K(e=>{const i=e.clock.elapsedTime;y.current+=1;const h=k.updatePositions(i,S.isMinimap);if(i-g.current>.05&&(g.current=i,r.current.filter((o,c)=>{const l=w[c];return l&&(l.id===P||l.id===E||U.some(H=>H.start===l.id||H.end===l.id))}).forEach(o=>{var c;(c=o==null?void 0:o.uniforms)!=null&&c.time&&(o.uniforms.time.value=i)}),x.current.filter((o,c)=>{const l=w[c];return l&&(l.id===P||l.id===E)}).forEach(o=>{var c;(c=o==null?void 0:o.uniforms)!=null&&c.time&&(o.uniforms.time.value=i)})),i-f.current>=.15){f.current=i;for(let a=0;a<w.length;a++){const t=w[a],o=p.current[a];if(!o)continue;const c=v.current[t.id];if(!c)continue;let l=!1;if(u&&!S.isMinimap&&(t.contentSource==="arch-discovery.md"||t.contentSource==="algo-awakening.md"||t.contentSource==="human-discovery.md")&&(l=!0),l){const Y=1+Math.sin(i*3)*.15;o.scale.set(Y,Y,Y)}else(o.scale.x!==1||o.scale.y!==1||o.scale.z!==1)&&o.scale.set(1,1,1);const H=t.id===P||t.id===E||_.has(t.id);o.visible=!0;const A=m.current[a];A&&(A.visible=H);{const V=h[t.id];V?o.position.set(V[0],V[1],V[2]):(console.warn(`NodesInstanced: Missing synchronized position for node ${t.id}`),o.position.set(c[0],c[1],c[2]));const D=m.current[a];D&&H?(D.visible=!0,D.position.copy(o.position)):D&&(D.visible=!1)}}}}),N.jsxs("group",{children:[I&&N.jsx("instancedMesh",{ref:I,args:[new Q,new ee,0],visible:!1}),w.map((e,i)=>{const h=P===e.id,b=_.has(e.id),n=E===e.id;let C=!1,M="";u&&(e.contentSource==="arch-discovery.md"?(C=!0,M="Choice"):e.contentSource==="algo-awakening.md"?(C=!0,M="Awakening"):e.contentSource==="human-discovery.md"&&(C=!0,M="Discovery"));const a=me(e.character).clone();return h?a.multiplyScalar(1.5):b?a.multiplyScalar(.5):n&&a.multiplyScalar(1.2),N.jsxs("group",{position:[0,0,0],userData:{nodeId:e.id},children:[C&&u&&!S.isMinimap&&M&&N.jsx(te,{position:[0,1.6,0],fontSize:.35,color:"white",anchorX:"center",anchorY:"middle",outlineWidth:.02,outlineColor:"#000000","material-depthTest":!1,"material-transparent":!0,children:M}),(n||h)&&N.jsxs("mesh",{ref:t=>{t&&(m.current[i]=t)},position:[0,0,0],children:[N.jsx("sphereGeometry",{args:[1.4,16,16]}),N.jsx("shaderMaterial",{ref:t=>{t&&(x.current[i]=t)},vertexShader:ue,fragmentShader:fe,uniforms:{color:{value:a},time:{value:0}},transparent:!0,depthWrite:!1})]}),N.jsxs("mesh",{ref:t=>{t&&(p.current[i]=t)},position:[0,0,0],onClick:t=>{t.stopPropagation&&t.stopPropagation();const o=new CustomEvent("node-unhover");if(window.dispatchEvent(o),u){if(C)try{s($(e.id)),s(G(e.id)),s(Z("reading")),s(O({nodeId:e.id,character:e.character,temporalValue:e.temporalValue,attractors:e.strangeAttractors}))}catch(c){console.error("Navigation error:",c)}return}if(B){if(T&&!T.includes(e.id))return;B(e.id)}else P===null?(s($(e.id)),s(G(e.id)),s(Z("reading")),s(O({nodeId:e.id,character:e.character,temporalValue:e.temporalValue,attractors:e.strangeAttractors}))):U.some(l=>l.start===P&&l.end===e.id||l.start===e.id&&l.end===P)&&(s($(e.id)),s(G(e.id)),s(Z("reading")),s(O({nodeId:e.id,character:e.character,temporalValue:e.temporalValue,attractors:e.strangeAttractors})))},onPointerOver:t=>{if(t.stopPropagation&&t.stopPropagation(),e.id!==E){s(ce(e.id));const o=new CustomEvent("node-hover",{detail:{position:{x:t.clientX,y:t.clientY-40},nodeId:e.id}});window.dispatchEvent(o)}},onPointerOut:t=>{t.stopPropagation&&t.stopPropagation(),s(J());const o=new CustomEvent("node-unhover");window.dispatchEvent(o)},onPointerLeave:t=>{t.stopPropagation&&t.stopPropagation(),s(J());const o=new CustomEvent("node-unhover");window.dispatchEvent(o)},children:[!h&&!n?N.jsx("octahedronGeometry",{args:[1,0]}):N.jsx("sphereGeometry",{args:[1,8,8]}),N.jsx("shaderMaterial",{ref:t=>{t&&(r.current[i]=t)},vertexShader:le,fragmentShader:de,uniforms:{color:{value:a},time:{value:0}}})]})]},e.id)})]})}),ve=`
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
`,pe=`
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
`,Ce=d.forwardRef((S,I)=>{const{connections:w,nodePositions:z,selectedNodeId:U,hoveredNodeId:F,positionSynchronizer:B}=S,T=d.useRef(null);ne.useImperativeHandle(I,()=>null);const u=d.useRef(null),k=d.useRef(null),{positions:s,colors:E,lineCount:j}=d.useMemo(()=>{const r=new Float32Array(w.length*2*3),x=new Float32Array(w.length*2*3);let p=0;for(const m of w){const v=z[m.source],y=z[m.target];if(v&&y){const f=new X(y[0]-v[0],y[1]-v[1],y[2]-v[2]).normalize(),g=.5,e=[v[0]+f.x*g,v[1]+f.y*g,v[2]+f.z*g],i=[y[0]-f.x*g,y[1]-f.y*g,y[2]-f.z*g];r.set(e,p*6),r.set(i,p*6+3);const h=U===m.source||U===m.target,b=F===m.source||F===m.target;let n;h?n=new R(49151):b?n=new R(8965375):n=new R(4473924),x.set([n.r,n.g,n.b],p*6),x.set([n.r,n.g,n.b],p*6+3),p++}}return{positions:r,colors:x,lineCount:p}},[w,z,U,F]);d.useEffect(()=>{var y,f;const r=u.current;if(!r)return;const x=(y=r.attributes.position)==null?void 0:y.array,p=(f=r.attributes.color)==null?void 0:f.array;if(!x||!p||x.length!==s.length||p.length!==E.length)try{r.setAttribute("position",new W(s,3)),r.setAttribute("color",new W(E,3)),r.setDrawRange(0,j*2)}catch(g){console.error("Error initializing geometry attributes:",g)}const m=r.attributes.position,v=r.attributes.color;m&&v&&(m.array.set(s),v.array.set(E),m.needsUpdate=!0,v.needsUpdate=!0)},[s,E,j]);const P=d.useRef(0),_=.15;return K(r=>{const x=r.clock.elapsedTime,p=x-P.current;if(!u.current||!u.current.attributes.position||!u.current.attributes.color)return;k.current&&(k.current.uniforms.time.value=r.clock.elapsedTime);const m=B.updatePositions(x),v=p>=_,y=p>=_/3;v&&(P.current=x);try{const f=u.current.attributes.position,g=u.current.attributes.color;let e=!1,i=!1;for(let h=0;h<w.length;h++){const b=w[h],n=m[b.source],C=m[b.target];if(!n||!C){console.warn(`ConnectionsBatched: Missing synchronized position for connection ${b.source} -> ${b.target}`);continue}const M=new X(C[0]-n[0],C[1]-n[1],C[2]-n[2]).normalize(),a=.5,t=new X(n[0]+M.x*a,n[1]+M.y*a,n[2]+M.z*a),o=new X(C[0]-M.x*a,C[1]-M.y*a,C[2]-M.z*a);v&&(f.setXYZ(h*2,t.x,t.y,t.z),f.setXYZ(h*2+1,o.x,o.y,o.z),e=!0);const c=U===b.source||U===b.target,l=F===b.source||F===b.target;if(c||l||y){let A;if(c){const V=Math.sin(r.clock.elapsedTime*2)*.1+.9;A=new R(49151).multiplyScalar(V)}else l?A=new R(8965375):A=new R(4473924);g.setXYZ(h*2,A.r,A.g,A.b),g.setXYZ(h*2+1,A.r,A.g,A.b),i=!0}}e&&(f.needsUpdate=!0),i&&(g.needsUpdate=!0)}catch(f){console.error("Error updating connection positions and colors:",f)}}),d.useEffect(()=>{if(u.current){const r=new oe({uniforms:{time:{value:0}},vertexShader:ve,fragmentShader:pe,vertexColors:!0,transparent:!0,side:ie,depthWrite:!1,depthTest:!0,opacity:1});T.current&&(T.current.material=r,k.current=r,T.current.frustumCulled=!1,T.current.renderOrder=10)}},[]),d.useEffect(()=>{u.current&&j>0&&(u.current.setDrawRange(0,j*2),console.log(`Setting draw range for ${j} connections (${j*2} vertices)`),u.current.attributes.position&&(u.current.attributes.position.needsUpdate=!0),u.current.attributes.color&&(u.current.attributes.color.needsUpdate=!0))},[j]),N.jsx("lineSegments",{ref:T,frustumCulled:!1,children:N.jsx("bufferGeometry",{ref:u})})});export{Ce as C,ye as N};
//# sourceMappingURL=node-view-CX8ZmfD4.js.map
