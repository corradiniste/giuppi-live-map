import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import map from './textures/water.png?url'
import cloudsMap from './textures/clouds.jpg?url'

const textureLoader = new THREE.TextureLoader()

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

locations.forEach((loc, i) => {
	const mesh = createLocation(loc, i)
	loc.mesh = mesh
	earth.add(mesh)

	if (prevLocation) {
		earth.add(createPath(prevLocation, loc))
	}

	prevLocation = loc
})

/**
 * velocità di rotazione radianti al secondo
 */
const vel = {
	value: 0.006,
}

const clock = new THREE.Clock()

/**
 * frame loop
 */
function tic() {
	controls.update()
	const delta = clock.getDelta()

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
