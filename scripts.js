import { GLTFLoader } from './threejs-dev/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './threejs-dev/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from './threejs-dev/examples/jsm/loaders/RGBELoader.js';
import { RoughnessMipmapper } from './threejs-dev/examples/jsm/utils/RoughnessMipmapper.js';
import { ParametricGeometries } from './threejs-dev/examples/jsm/geometries/ParametricGeometries.js';

//Variables
let camera, scene,renderer, controls, clothGeometry, mesh, ball, line;

const MASS = 0.01;
const restDistance = 10;
const xSegs = 30;
const ySegs = 30;
const diff = new THREE.Vector3();
const BallSize = 45;
const ballPosition = new THREE.Vector3( 2, 150, -4 );
let back = false;
let pins = [];

const clothFunction = plane( restDistance * xSegs, restDistance * ySegs );

const GRAVITY = 981 * 0.4;
const gravity = new THREE.Vector3( 0, - GRAVITY, 0 ).multiplyScalar( MASS );

const TIMESTEP = 18 / 1000;
const TIMESTEP_SQ = TIMESTEP * TIMESTEP;
const DAMPING = 0.03;
const DRAG = 1 - DAMPING;

//Surface CLASS

//Частици
class Particle {
    constructor(x,y,z, mass){
        this.position = new THREE.Vector3();
        this.previos = new THREE.Vector3();
        this.original = new THREE.Vector3();
        this.a = new THREE.Vector3( 0, 0, 0 ); // acceleration
		this.mass = mass;
		this.invMass = .7/ mass;
		this.tmp = new THREE.Vector3();
		this.tmp2 = new THREE.Vector3();

        clothFunction(x,y,this.position);
        clothFunction(x,y,this.previos);
        clothFunction(x,y,this.original);
    }

    // Force -> Acceleration

    addForce( force ) {

        this.a.add(
            this.tmp2.copy( force ).multiplyScalar( this.invMass )
        );

    }

    // Performs Verlet integration

    integrate( timesq ) {

        const newPos = this.tmp.subVectors( this.position, this.previos );
        newPos.multiplyScalar( DRAG ).add( this.position );
        newPos.add( this.a.multiplyScalar( timesq ) );

        this.tmp = this.previos;
        this.previos = this.position;
        this.position = newPos;

        this.a.set( 0, 0, 0 );

    }

   
}


//Ткань
class Cloth {
    constructor(w = 10, h = 10){
            this.w = w;
            this.h = h;

            const particles = [];
            const constraints = [];

            //Создаем частици
            for(let v=0; v<=h; v++){
                for(let u=0; u<=w; u++){
                    particles.push(new Particle(u/w, v/h,0,MASS));         
                }
            }

            //Создаем ограничители

            

            //Проход по плоскости по обоим координатам, помещаем в constraints Particles текущей координаты 
            //и соседних по U и V
            for (let v = 0; v < h; v++){
                for(let u = 0; u < w; u++){
                    constraints.push([particles[index( u , v )],
                                    particles[index(u, v + 1)],
                                    restDistance]);

                                    constraints.push([particles[index( u , v )],
                                    particles[index(u + 1, v )],
                                    restDistance]);
                }
            }

              //Координата u приравнивается к w(ширине) для v = 0, проход цикла по правой крайней грани плоскости
            for (let u = w, v = 0; v < h; v++){
                constraints.push([particles[index( u, v )],
                                 particles[index( u, v + 1)],
                                 restDistance]);
            }

             //Координата v приравнивается к h(высоте) для u = 0, проход цикла по правой крайней грани плоскости
            for (let v = h, u = 0; v < w; u++){
                constraints.push([particles[index( u, v )],
                                 particles[index( u + 1, v)],
                                 restDistance]);
            }

            this.particles = particles;
			this.constraints = constraints;

            function index( u, v ) {
               return u + v * ( w + 1  );
            }

            this.index = index;
            
    }
    
}


const cloth = new Cloth( xSegs , ySegs );
const pinsFormation = [];




//Bottom pin
//pins = [ 0, 1,2,3, 4, 5, 6, 7, 8, 9, 10, 11, 12 , 13 , 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,26,27,28,29,30];

//TOP pin
pins = [ 930, 931, 932, 933 , 934 ,935, 936, 937, 938, 939, 940, 941, 942, 943, 944, 945, 946, 947, 948, 949, 950, 951, 952, 953,
         954, 955, 956, 957, 958, 959, 960];


init();
PlaceBall();

addParamMesh();
showHelpers();




function init(){
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer();
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    controls = new OrbitControls( camera, renderer.domElement );
    camera.position.z = 405;
    //controls.update();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const directionalLight = new THREE.DirectionalLight( 0xffffff, 3.5 );
    scene.add( directionalLight );
}

function animate() {
	requestAnimationFrame( animate );
    
    if(back) {
        //ball.position.z -= 3.5;
    } else{
        //ball.position.z += 3.5;
    }
    
    if(ball.position.z >= 135) {
        back=true;
    }
    if(ball.position.z <= -40) {
        back=false;
    }
        
    
	
	simulte();
    render();
    controls.update();
	
}
animate();



//Parametric mesh
function addParamMesh(){
    const loader = new THREE.TextureLoader();
	const clothTexture = loader.load( 'texture/net.png' );
	clothTexture.anisotropy = 16;
    clothTexture.wrapS = THREE.RepeatWrapping;
    clothTexture.wrapT = THREE.RepeatWrapping;
    clothTexture.repeat.set( 8, 8 );
    clothGeometry = new THREE.ParametricGeometry( clothFunction, cloth.w, cloth.h ); //Параметрическая сетка с доступом к вершинам
    const material = new THREE.MeshBasicMaterial( {
        alphaMap: clothTexture,
        side: THREE.DoubleSide,
        alphaTest: 0.1
    } );
    //const material = new THREE.MeshNormalMaterial( { color: 0x00ff00 } );
    mesh = new THREE.Mesh( clothGeometry, material );
    
	mesh.position.set( 0, 0, 0 );
	mesh.castShadow = true;

    const wireframe = new THREE.WireframeGeometry( clothGeometry );
    line = new THREE.LineSegments( wireframe );
    line.material.depthTest = false;
    line.material.opacity = 0.25;
    line.material.transparent = true;
    line.position.set( 0, 0, 0 );

    scene.add( line );

	scene.add( mesh );

}

function plane_old( width, height ) {

    return function ( u, v, target ) {
        const x = ( u - 0.5 ) * width;
        const y = ( v + 0.5 ) * height;
        //const x = u * width;
        //const y = v * height;
        const z = 0;
        target.set( x, y, z );

    };

}

function plane( width, height ) {

    return function ( u, v, target ) {
        u *=  Math.PI;
        v *=  Math.PI;

        let x = Math.cos( u ) ;
        let y = v;
        
        let z = Math.sin( u );
        
        target.set( x, y, z ).multiplyScalar(100);       

    };

}

function satisfyConstraints( p1, p2, distance ) {

    diff.subVectors( p2.position, p1.position ); //Дистанция между p1 и p2 (текущая)
    const currentDist = diff.length();
    if ( currentDist === 0 ) return; // prevents division by 0
    const correction = diff.multiplyScalar( 1 - distance  / currentDist );
    const correctionHalf = correction.multiplyScalar( .5);
    p1.position.add( correctionHalf );
    p2.position.sub( correctionHalf );
    

}

//Helpers
function showHelpers(){
    const axesHelper = new THREE.AxesHelper( 5 );
    scene.add( axesHelper );

    const helper = new THREE.CameraHelper( camera );
    scene.add( helper );

    const dir = new THREE.Vector3( 1, 2, 0 );

    //normalize the direction vector (convert to vector of length 1)
    dir.normalize();

    const origin = new THREE.Vector3( 0, 0, 0 );
    const length = 1;
    const hex = 0xffff00;

    const arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
    scene.add( arrowHelper );
}

function PlaceBall(){
    const ballGeo = new THREE.SphereGeometry( BallSize, 32, 16 );
	const ballMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    ball = new THREE.Mesh(ballGeo, ballMaterial);
    ball.visible = false;
    ball.position.copy( ballPosition );
    scene.add(ball);
}

function render(){
    const p = cloth.particles;

   for ( let i = 0, il = p.length; i < il; i ++ ) {

        const v = p[ i ].position;

        clothGeometry.attributes.position.setXYZ( i, v.x, v.y, v.z );

    }

    clothGeometry.attributes.position.needsUpdate = true;

    clothGeometry.computeVertexNormals();
    renderer.render( scene, camera );
}

function simulte(){

    const particles = cloth.particles;

    for ( let i = 0, il = particles.length; i < il; i ++ ) {

        const particle = particles[ i ];
        particle.addForce( gravity );

        particle.integrate( TIMESTEP_SQ );

    }

    const constraints = cloth.constraints;
	const il = constraints.length;
    


    /*for ( let i = 0; i < il; i ++ ) {

        const constraint = constraints[ i ];
        satisfyConstraints( constraint[ 0 ], constraint[ 1 ], constraint[ 2 ] );

    }*/

    for ( let i = 0, il = particles.length; i < il; i ++ ) {

        const particle = particles[ i ]; //Забиарем одну позицию из particle
        const pos = particle.position;
        diff.subVectors( pos, ball.position ); //вычетание векторов
        if ( diff.length() < BallSize ) { //соприкосновение сетки с мячом

            // collided
            diff.normalize().multiplyScalar( BallSize ); //умнодение векторов на скалярное значение
            pos.copy( ball.position ).add( diff ); //обновляем значение particles

        }

    }

    for ( let i = 0; i < il; i ++ ) {

        const constraint = constraints[ i ];
        satisfyConstraints( constraint[ 0 ], constraint[ 1 ], constraint[ 2 ] );

    }

    // Floor Constraints

    for ( let i = 0, il = particles.length; i < il; i ++ ) {

        const particle = particles[ i ];
        const pos = particle.position;
        if ( pos.y < - 300 ) {

            pos.y = - 300;

        }

    }

    //PIN constrain
    console.log("PIN "+particles.length);
    for ( let i = 0, il = pins.length; i < il; i ++ ) {
   
        const xy = pins[ i ];
        const p = particles[ xy ];
        p.position.copy( p.original );
        p.previos.copy( p.original );

    }



}







