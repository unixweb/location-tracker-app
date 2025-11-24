/**
 * Demo GPS data for landing page showcase
 * 3 devices moving through Munich with realistic routes
 */

export interface DemoLocation {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface DemoDevice {
  id: string;
  name: string;
  color: string;
  route: DemoLocation[];
}

// Device 1: Route through Munich city center (Marienplatz → Odeonsplatz → Englischer Garten)
const route1: [number, number][] = [
  [48.1374, 11.5755], // Marienplatz
  [48.1388, 11.5764], // Kaufingerstraße
  [48.1402, 11.5775], // Stachus
  [48.1425, 11.5788], // Lenbachplatz
  [48.1448, 11.5798], // Odeonsplatz
  [48.1472, 11.5810], // Ludwigstraße
  [48.1495, 11.5823], // Siegestor
  [48.1520, 11.5840], // Englischer Garten Süd
  [48.1545, 11.5858], // Eisbach
  [48.1570, 11.5880], // Kleinhesseloher See
];

// Device 2: Route to Olympiapark (Hauptbahnhof → Olympiapark)
const route2: [number, number][] = [
  [48.1408, 11.5581], // Hauptbahnhof
  [48.1435, 11.5545], // Karlstraße
  [48.1465, 11.5510], // Brienner Straße
  [48.1495, 11.5475], // Königsplatz
  [48.1530, 11.5445], // Josephsplatz
  [48.1565, 11.5420], // Nymphenburg
  [48.1600, 11.5450], // Olympiapark Süd
  [48.1635, 11.5480], // Olympiaturm
  [48.1665, 11.5510], // Olympiastadion
  [48.1690, 11.5540], // BMW Welt
];

// Device 3: Route along Isar river (Deutsches Museum → Flaucher)
const route3: [number, number][] = [
  [48.1300, 11.5835], // Deutsches Museum
  [48.1275, 11.5850], // Ludwigsbrücke
  [48.1250, 11.5865], // Muffathalle
  [48.1225, 11.5880], // Wittelsbacherbrücke
  [48.1200, 11.5895], // Gärtnerplatz
  [48.1175, 11.5910], // Reichenbachbrücke
  [48.1150, 11.5925], // Isartor
  [48.1125, 11.5940], // Flaucher Nord
  [48.1100, 11.5955], // Flaucher
  [48.1075, 11.5970], // Tierpark Hellabrunn
];

export const DEMO_DEVICES: DemoDevice[] = [
  {
    id: 'demo-1',
    name: 'City Tour',
    color: '#3b82f6', // Blue
    route: route1.map((coords, idx) => ({
      lat: coords[0],
      lng: coords[1],
      timestamp: new Date(Date.now() + idx * 1000).toISOString(),
    })),
  },
  {
    id: 'demo-2',
    name: 'Olympiapark Route',
    color: '#10b981', // Green
    route: route2.map((coords, idx) => ({
      lat: coords[0],
      lng: coords[1],
      timestamp: new Date(Date.now() + idx * 1000).toISOString(),
    })),
  },
  {
    id: 'demo-3',
    name: 'Isar Tour',
    color: '#f59e0b', // Orange
    route: route3.map((coords, idx) => ({
      lat: coords[0],
      lng: coords[1],
      timestamp: new Date(Date.now() + idx * 1000).toISOString(),
    })),
  },
];

// Calculate center of all routes for initial map view
export const DEMO_MAP_CENTER: [number, number] = [48.1485, 11.5680]; // Munich center
export const DEMO_MAP_ZOOM = 12;
