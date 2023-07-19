import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import map from './textures/water.png?url'
import cloudsMap from './textures/clouds.jpg?url'

const textureLoader = new THREE.TextureLoader()
const cursor = new THREE.Vector2()
const raycaster = new THREE.Raycaster()

const locations = [
	{
		name: 'Lisbona',
		coords: [38.74, -9.2],
	},
	{
		name: 'Syros',
		coords: [37.43, 24.87],
	},
	{
		name: 'Valfrejus',
		coords: [45.17, 6.64],
	},
	{
		name: 'Albenga',
		coords: [44.05, 8.19],
	},
	{
		name: 'Salerno',
		coords: [40.67, 14.75],
	},
	{
		name: 'Milano',
		coords: [45.46, 9.09],
	},
	{
		name: 'Torino',
		coords: [45.07, 7.63],
	},
	{
		name: 'Hội An',
		coords: [15.91, 108.33],
	},
	{
		name: 'Ko Lanta',
		coords: [7.66, 98.92],
	},
	{
		name: 'Kyoto',
		coords: [35.09, 135.55],
	},
	{
		name: 'Ko Samet',
		coords: [12.55, 101.43],
	},
	{
		name: 'Tokyo',
		coords: [35.5, 139.11],
	},
	{
		name: 'Hanoi',
		coords: [21.02, 105.81],
	},
	{
		name: 'Kuala Lumpur',
		coords: [3.13, 101.6],
	},
]

/**
 * Scene
 */
const scene = new THREE.Scene()

const axesHelper = new THREE.AxesHelper(10)
// scene.add(axesHelper)

/**
 * render sizes
 */
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
}
/**
 * Camera
 */
const fov = 90
const camera = new THREE.PerspectiveCamera(fov, sizes.width / sizes.height, 0.1)

camera.position.set(7.5, 10, 7.5)
camera.lookAt(new THREE.Vector3(0, 2.5, 0))

/**
 * renderer
 */
const renderer = new THREE.WebGLRenderer({
	antialias: window.devicePixelRatio < 2,
	logarithmicDepthBuffer: true,
})
renderer.setSize(sizes.width, sizes.height)

const pixelRatio = Math.min(window.devicePixelRatio, 2)
renderer.setPixelRatio(pixelRatio)
document.body.appendChild(renderer.domElement)

/**
 * OrbitControls
 */
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const ambientLight = new THREE.AmbientLight('#ffffff', 0.7)
const pointLight = new THREE.PointLight('#ffffff', 0.3, 50)
scene.add(ambientLight)
camera.add(pointLight)
scene.add(camera)

const earth = createEarth()
earth.rotation.y = Math.PI * -0.3
scene.add(earth)
const clouds = earth.getObjectByName('cloud')

let prevLocation

printLocation(locations)
const cards = document.querySelectorAll('.card')

locations.forEach((loc, i) => {
	const mesh = createLocation(loc, i)
	loc.mesh = mesh
	loc.HTMLCard = cards[i]
	earth.add(mesh)

	if (prevLocation) {
		earth.add(createPath(prevLocation, loc))
	}

	prevLocation = loc
})

const locationMeshes = locations.map(({ mesh }) => mesh)
// console.log(locationMeshes)

/**
 * velocità di rotazione radianti al secondo
 */
const vel = {
	value: 0.006,
}

const clock = new THREE.Clock()
const finalScale = new THREE.Vector3(2, 2, 2)

/**
 * frame loop
 */
function tic() {
	controls.update()
	const delta = clock.getDelta()

	raycaster.setFromCamera(cursor, camera)
	const intersects = raycaster.intersectObjects(locationMeshes)
	// console.log(intersects)
	const obj = intersects[0]
	console.log(obj)

	if (obj) {
		vel.value = THREE.MathUtils.lerp(vel.value, 0, 0.05)
	} else {
		vel.value = THREE.MathUtils.lerp(vel.value, 0.006, 0.05)
	}

	const x = (cursor.x * 0.5 + 0.5) * window.innerWidth
	const y = (-cursor.y * 0.5 + 0.5) * window.innerHeight

	console.log(x, y)

	locations.forEach((loc) => {
		const { mesh, HTMLCard: card } = loc
		if (mesh === obj?.object) {
			mesh.scale.lerp(finalScale, 0.05)
			card.style.opacity = THREE.MathUtils.lerp(card.style.opacity, 1, 0.05)
			card.style.top = `${y + 20}px`
			card.style.left = `${x + 20}px`
		} else {
			mesh.scale.lerp(new THREE.Vector3().setScalar(1), 0.1)
			card.style.opacity = THREE.MathUtils.lerp(card.style.opacity, 0, 0.1)
		}
	})

	renderer.render(scene, camera)

	earth.rotation.y -= delta * vel.value * 5
	if (clouds) {
		clouds.rotation.y += delta * vel.value
	}

	requestAnimationFrame(tic)
}

requestAnimationFrame(tic)

window.addEventListener('resize', onResize)

function onResize() {
	console.log('resize')
	sizes.width = window.innerWidth
	sizes.height = window.innerHeight

	camera.aspect = sizes.width / sizes.height
	camera.updateProjectionMatrix()

	renderer.setSize(sizes.width, sizes.height)

	const pixelRatio = Math.min(window.devicePixelRatio, 2)
	renderer.setPixelRatio(pixelRatio)
}

function createEarth() {
	const mapTexture = textureLoader.load(map)

	const geometry = new THREE.SphereGeometry(8, 90, 90)
	const material = new THREE.MeshStandardMaterial({
		color: 0x88af34,
		transparent: true,
		// opacity: 0.5,
		map: mapTexture,
	})

	material.onBeforeCompile = (shader) => {
		// console.log(shader.fragmentShader)
		shader.fragmentShader = shader.fragmentShader.replace(
			'#include <map_fragment>',
			`
		#ifdef USE_MAP
			vec4 map = texture2D( map, vMapUv );
			diffuseColor *= vec4( vec3(1.) - map.rgb, 1. - map.r );

		#endif
		`
		)
	}

	const atmo = createAtmo()
	const water = createWater(mapTexture)
	const earth = new THREE.Mesh(geometry, material)

	const clouds = createClouds()

	const group = new THREE.Group()
	group.add(atmo, clouds, earth, water)

	return group
}

scene.background = new THREE.Color('#ffcc33')

function createWater(map) {
	const geometry = new THREE.SphereGeometry(7.85, 90, 90)
	const material = new THREE.MeshStandardMaterial({
		color: 0x38bdf8,
		map: map,
	})
	const water = new THREE.Mesh(geometry, material)
	water.name = 'water'

	return water
}

function createAtmo() {
	const geometry = new THREE.SphereGeometry(8.15, 90, 90)
	const material = new THREE.MeshStandardMaterial({
		color: 0x000000,
		transparent: true,
		// opacity: 0.9,
		side: THREE.BackSide,
		depthWrite: false,
	})

	const atmo = new THREE.Mesh(geometry, material)
	atmo.name = 'atmo'
	return atmo
}

function createClouds() {
	const geometry = new THREE.SphereGeometry(8.2, 90, 90)
	const map = textureLoader.load(cloudsMap)
	const material = new THREE.MeshStandardMaterial({
		color: 0xffffff,
		transparent: true,
		alphaMap: map,
	})

	const clouds = new THREE.Mesh(geometry, material)
	clouds.name = 'cloud'
	return clouds
}

function createLocation(location, i) {
	const material = new THREE.MeshBasicMaterial({
		color: 0xffffff,
	})

	const geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.01)
	const mesh = new THREE.Mesh(geometry, material)

	const [lt, ln] = location.coords

	const pos = getLocPositionByCoords(lt, ln)
	mesh.position.copy(pos)

	mesh.lookAt(0, 0, 0)
	mesh.geometry.rotateX(Math.PI * 0.5)

	return mesh
}

function getLocPositionByCoords(lt, ln, radius = 8.01) {
	const t = THREE.MathUtils.degToRad(90 - lt)
	const p = THREE.MathUtils.degToRad(ln + 90)

	const pos = new THREE.Vector3()
	pos.setFromSphericalCoords(radius, t, p)

	return pos
}

function createPath(locA, locB) {
	const A = getLocPositionByCoords(...locA.coords, 8)
	const B = getLocPositionByCoords(...locB.coords, 8)

	const points = []
	const n = 10

	for (let i = 0; i < n + 1; i++) {
		const point = A.clone()
			.lerp(B, 0.1 * i)
			.normalize()
			.multiplyScalar(8 + Math.sin((Math.PI * i) / 10) * 2)
		points.push(point)
	}

	const curve = new THREE.CatmullRomCurve3(points)

	const geometry = new THREE.TubeGeometry(curve, 50, 0.02, 5)
	const material = new THREE.MeshBasicMaterial({
		color: 0xffffff,
	})

	const tube = new THREE.Mesh(geometry, material)

	return tube
}

window.addEventListener('mousemove', (e) => {
	cursor.x = 2 * (e.clientX / window.innerWidth) - 1
	cursor.y = -2 * (e.clientY / window.innerHeight) + 1
})

/**
 * HTML cards
 */

function printLocation(locations) {
	// const card = document.querySelector('.card')
	// console.log(card)
	// card.remove()

	const container = document.createElement('div')
	container.classList.add(
		'grid',
		'grid-cols-8',
		'gap-2',
		'fixed',
		'right-0',
		'left-0',
		'z-50',
		'p-4',
		'w-full',
		'top-0',
		'overflow-auto'
	)

	locations.forEach((loc) => {
		const [lt, ln] = loc.coords
		const c = `
		<div
			style="opacity: 1"
			class="fixed pointer-events-none select-none card w-64 flex flex-col bg-amber-100 rounded border-4 border-gray-900 shadow-brutal"
		>
			<div class="bg-blue-300 h-8 border-b-4 border-gray-900">
				<div class="flex gap-2 items-center h-full px-2">
					<div
						class="w-4 border-2 border-gray-900 h-4 rounded-full bg-red-800"
					></div>
					<div
						class="w-4 border-2 border-gray-900 h-4 rounded-full bg-yellow-600"
					></div>
					<div
						class="w-4 border-2 border-gray-900 h-4 rounded-full bg-green-700"
					></div>
				</div>
			</div>
			<div class="absolute -top-8 p-2 -right-8 bg-rose-200 rounded-3xl rounded-br-xl border-4 border-gray-900 shadow-[5px_5px_0px_0px_#000]">
				<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="500px" height="500px" viewBox="0 0 500 500" enable-background="new 0 0 500 500" class="w-10 lg:w-12 h-10 lg:h-12 text-gray-900"><path id="path6" fill="currentColor" d="M61.925,60.729c12.008-12.011,31.235-2.873,43.023,4.532    c13.794,8.665,25.993,19.841,37.474,31.321l66.963,66.964l208.147-39.9c1.233-0.618,3.14-0.279,4.407,0.074    c1.396,0.388,2.66,1.134,3.684,2.158l17.857,17.857c2.201,2.202,2.87,5.395,2.349,8.403c-0.485,2.808-2.273,4.955-4.86,6.104    l-160.436,76.451l68.359,68.358c18.595-5.313,37.19-10.65,55.888-15.595c3.688-0.975,7.382-1.954,11.105-2.788    c0.895-0.2,1.794-0.403,2.702-0.532c2.527-0.359,5.252,0.671,7.035,2.454l17.856,18.135c2.116,2.117,2.855,5.195,2.379,8.107    c-0.446,2.733-2.196,4.845-4.61,6.123l-78.125,43.248l-43.248,78.125c-1.447,2.314-3.645,3.984-6.385,4.367    c-2.839,0.397-5.792-0.36-7.846-2.414l-17.857-17.857c-1.888-1.887-2.842-4.712-2.403-7.356c0.211-1.274,0.511-2.535,0.808-3.792    c1.221-5.165,2.609-10.292,3.994-15.414c4.532-16.765,9.293-33.469,14.064-50.167l-68.359-68.359l-76.451,160.437    c-1.107,2.49-3.146,4.268-5.84,4.811c-3.074,0.619-6.408-0.039-8.668-2.3l-17.857-17.856c-1.674-1.674-2.511-3.813-2.511-6.418    l0.279-1.674l39.898-208.146l-66.965-66.964c-8.304-8.304-16.31-16.962-23.472-26.28c-5.323-6.926-10.284-14.277-13.852-22.277    C55.979,82.639,53.229,69.417,61.925,60.729C65.737,56.915,58.108,64.542,61.925,60.729z"></path></svg>
			</div>
			<div class="p-2 content">
				<h3 class="font-bold text-lg">${loc.name}</h3>
				<ul>
					<li><strong>lat:</strong> ${lt}</li>
					<li><strong>long:</strong> ${ln}</li>
				</ul>
			</div>
		</div>
		`
		// console.log(c)

		container.innerHTML += c
	})

	document.body.appendChild(container)
}
