
import React, { useState } from 'react';
import { Location, NPC } from '../types';
import { Card, Button } from './Layout';
import { MapPin, Navigation, Maximize2, X, Box, Loader2, ZoomIn, ZoomOut, User, Paintbrush, Download } from 'lucide-react';
import * as GeminiService from '../services/geminiService';

interface MapPanelProps {
  currentLocation: Location;
  visitedLocations: Location[];
  onFastTravel: (location: Location) => void;
  isTraveling: boolean;
  npcs: NPC[];
}

export const MapPanel: React.FC<MapPanelProps> = ({ currentLocation, visitedLocations, onFastTravel, isTraveling, npcs }) => {
  const expandedLocationRef = React.useRef<Location | null>(null);
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);
  const [generating3D, setGenerating3D] = useState(false);
  const [generatingMap, setGeneratingMap] = useState(false);
  const [mapHtml, setMapHtml] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [generatedMapImage, setGeneratedMapImage] = useState<string | null>(null);

  const handleGenerate3D = async (loc: Location) => {
      setGenerating3D(true);
      setMapHtml(null); 
      try {
          const html = await GeminiService.generateVoxelMapHTML(loc.name, loc.description);
          setMapHtml(html);
      } catch (e) {
          console.error(e);
          setMapHtml(null);
          alert("地圖生成失敗，請稍後再試。");
      }
      setGenerating3D(false);
  };

  const handleGenerate2DMap = async (loc: Location) => {
      setGeneratingMap(true);
      try {
          const img = await GeminiService.generateImage(`Top-down view 2D map of ${loc.name}, ${loc.description}. Detailed, fantasy RPG style.`, 'map');
          setGeneratedMapImage(img);
      } catch (e) {
          console.error(e);
          alert("2D 地圖生成失敗。");
      }
      setGeneratingMap(false);
  };

  const handleDownloadHtml = () => {
      if (!mapHtml || !expandedLocation) return;
      const blob = new Blob([mapHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${expandedLocation.name}_VoxelScene.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const closeExpanded = () => {
      setExpandedLocation(null);
      setMapHtml(null);
      setGeneratedMapImage(null);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.6));

  const getNpcsAtLocation = (locId: string) => npcs.filter(n => n.locationId === locId);

  return (
    <div className="h-full flex flex-col gap-4">
      <Card title="世界地圖 (Vox-World)" className="h-full flex flex-col bg-slate-900/40 border-slate-800 relative overflow-hidden">
         <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-slate-900/80 p-1 rounded-lg border border-slate-700">
             <button onClick={() => setExpandedLocation(currentLocation)} className="p-2 hover:text-cyan-400 text-slate-400" title="當前位置詳情"><MapPin size={20}/></button>
             <button onClick={handleZoomIn} className="p-2 hover:text-cyan-400 text-slate-400" title="放大"><ZoomIn size={20}/></button>
             <button onClick={handleZoomOut} className="p-2 hover:text-cyan-400 text-slate-400" title="縮小"><ZoomOut size={20}/></button>
         </div>

         <div className="flex-1 overflow-auto p-6 custom-scrollbar perspective-1000 relative">
            <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pb-12 pt-4 transition-transform duration-300 origin-top-left"
                style={{ transform: `scale(${zoomLevel})`, width: `${100/zoomLevel}%` }}
            >
                {visitedLocations.map(loc => {
                    const isCurrent = loc.id === currentLocation.id;
                    const locationNpcs = getNpcsAtLocation(loc.id);

                    return (
                        <div key={loc.id} className="group perspective-1000 w-full aspect-[4/3] flex items-center justify-center">
                            {/* 3D Voxel Box Simulator */}
                            <div 
                                onClick={() => setExpandedLocation(loc)}
                                className={`
                                w-4/5 h-4/5 relative preserve-3d transition-transform duration-700 ease-out cursor-pointer
                                group-hover:rotate-x-12 group-hover:rotate-y-12 hover:-translate-y-4
                            `}>
                                {/* Front Face */}
                                <div className={`
                                    absolute inset-0 backface-hidden overflow-hidden border-2 shadow-2xl bg-slate-800
                                    ${isCurrent ? 'border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)]' : 'border-slate-600 shadow-black'}
                                `} style={{ transform: 'translateZ(20px)' }}>
                                    <div className="w-full h-full relative">
                                        {loc.voxelMapUrl ? (
                                            <img src={loc.voxelMapUrl} alt={loc.name} className="w-full h-full object-cover pixelated" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600 pattern-grid-lg">
                                                <span className="text-xs font-mono">體素數據缺失</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent"></div>
                                        
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <h3 className={`font-bold text-lg ${isCurrent ? 'text-cyan-300' : 'text-slate-200'} drop-shadow-md`}>{loc.name}</h3>
                                            <p className="text-[10px] text-slate-400 line-clamp-1 font-mono">{loc.description}</p>
                                        </div>

                                        {isCurrent && (
                                            <div className="absolute top-3 right-3 bg-cyan-600/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-sm shadow-lg flex items-center gap-1 border border-cyan-400/50">
                                                <MapPin size={10} /> 當前
                                            </div>
                                        )}

                                        {/* NPC Markers */}
                                        {locationNpcs.length > 0 && (
                                            <div className="absolute top-3 left-3 flex -space-x-2">
                                                {locationNpcs.slice(0, 3).map(npc => (
                                                    <div key={npc.id} className="w-6 h-6 rounded-full border border-white bg-slate-700 overflow-hidden relative group/npc" title={npc.name}>
                                                        {npc.avatarUrl ? <img src={npc.avatarUrl} className="w-full h-full object-cover"/> : <User className="p-1 w-full h-full text-white"/>}
                                                    </div>
                                                ))}
                                                {locationNpcs.length > 3 && (
                                                    <div className="w-6 h-6 rounded-full border border-white bg-slate-900 text-[8px] text-white flex items-center justify-center">
                                                        +{locationNpcs.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Maximize2 size={16} className="text-white drop-shadow-md" />
                                        </div>
                                    </div>
                                </div>

                                {/* Top Face (Simulated 3D) */}
                                <div className="absolute top-0 left-0 right-0 h-10 bg-slate-700 border border-slate-600 origin-bottom transform -translate-y-10 rotate-x-90 translate-z-20 brightness-150"></div>
                                
                                {/* Right Face (Simulated 3D) */}
                                <div className="absolute top-0 bottom-0 right-0 w-10 bg-slate-900 border border-slate-800 origin-left transform translate-x-10 rotate-y-90 translate-z-20 brightness-50"></div>
                                
                                {/* Left Face (Hidden usually but helps illusion) */}
                                <div className="absolute top-0 bottom-0 left-0 w-10 bg-slate-800 border border-slate-700 origin-right transform -translate-x-10 -rotate-y-90 translate-z-20"></div>

                                {/* Bottom Face */}
                                <div className="absolute bottom-0 left-0 right-0 h-10 bg-black border border-slate-900 origin-top transform translate-y-10 -rotate-x-90 translate-z-20"></div>

                                {/* Floor Shadow */}
                                <div className="absolute -bottom-16 left-0 right-0 h-10 bg-black/40 blur-xl rounded-full transform scale-x-110 translate-z-[-50px] transition-all group-hover:scale-x-125 group-hover:bg-black/60"></div>
                            </div>
                        </div>
                    );
                })}
            </div>
         </div>
         <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-500 text-center font-mono uppercase tracking-widest flex justify-between items-center px-6">
            <span>體素地圖系統 v4.1 (交互式)</span>
            <span>已探索: {visitedLocations.length}</span>
         </div>
         <style>{`
            .perspective-1000 { perspective: 1200px; }
            .preserve-3d { transform-style: preserve-3d; }
            .backface-hidden { backface-visibility: hidden; }
            .rotate-x-12 { transform: rotateX(12deg); }
            .rotate-y-12 { transform: rotateY(12deg); }
            .rotate-x-90 { transform: rotateX(90deg); }
            .rotate-y-90 { transform: rotateY(90deg); }
            .translate-z-20 { transform: translateZ(20px); }
            .translate-z-40 { transform: translateZ(40px); }
            .pixelated { image-rendering: pixelated; }
         `}</style>
      </Card>

      {/* Full Screen Interactive Modal */}
      {expandedLocation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in p-4">
              <div className="relative w-full max-w-4xl h-full max-h-[80vh] bg-slate-900 rounded-lg border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.3)] overflow-hidden flex flex-col">
                  <button 
                      className="absolute top-4 right-4 z-50 bg-black/50 p-2 rounded-full text-white hover:bg-red-500 transition-colors"
                      onClick={closeExpanded}
                  >
                      <X size={24} />
                  </button>

                  <div className="flex-1 relative overflow-hidden bg-black flex flex-col items-center justify-center">
                      {generating3D && (
                          <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center">
                              <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4"/>
                              <div className="text-cyan-400 font-mono text-lg animate-pulse">正在構建體素世界...</div>
                              <div className="text-slate-500 text-xs mt-2">正在編寫 Three.js 代碼</div>
                          </div>
                      )}

                      {mapHtml ? (
                          <iframe 
                              srcDoc={mapHtml}
                              title="3D Map"
                              className="w-full h-full border-none"
                              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                          />
                      ) : generatedMapImage ? (
                          <img src={generatedMapImage} className="w-full h-full object-contain" />
                      ) : (
                          <>
                              {expandedLocation.voxelMapUrl ? (
                                 <img src={expandedLocation.voxelMapUrl} className="w-full h-full object-contain pixelated" />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center text-slate-500 pattern-grid-lg">
                                     <div className="text-center">
                                         <Box size={48} className="mx-auto mb-2 opacity-50"/>
                                         <span>未生成 3D 數據</span>
                                     </div>
                                 </div>
                              )}
                              
                              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                                   <h2 className="text-4xl font-bold text-white mb-2">{expandedLocation.name}</h2>
                                   <p className="text-lg text-slate-300 max-w-2xl font-serif leading-relaxed">{expandedLocation.description}</p>
                              </div>
                          </>
                      )}
                  </div>

                  <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
                      <div className="flex gap-2">
                          <Button 
                              size="sm" 
                              onClick={() => handleGenerate3D(expandedLocation)} 
                              disabled={generating3D}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                          >
                              {generating3D ? <Loader2 className="animate-spin mr-1" size={14}/> : <Box className="mr-1" size={14}/>}
                              {generating3D ? "構建中..." : "構建 3D 體素場景"}
                          </Button>
                          <Button 
                              size="sm" 
                              onClick={() => handleGenerate2DMap(expandedLocation)} 
                              disabled={generatingMap}
                              className="bg-amber-700 hover:bg-amber-600 text-white text-xs"
                          >
                              {generatingMap ? <Loader2 className="animate-spin mr-1" size={14}/> : <Paintbrush className="mr-1" size={14}/>}
                              {generatingMap ? "繪製中..." : "生成 2D 俯視地圖"}
                          </Button>
                          {mapHtml && (
                              <Button size="sm" onClick={handleDownloadHtml} className="bg-green-600 hover:bg-green-500 text-white text-xs">
                                  <Download size={14} className="mr-1"/> 下載 HTML
                              </Button>
                          )}
                      </div>
                      
                      {expandedLocation.id !== currentLocation.id ? (
                          <Button 
                              onClick={() => { onFastTravel(expandedLocation); closeExpanded(); }}
                              disabled={isTraveling}
                              className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                          >
                              <Navigation className="mr-2 inline" /> 
                              啟動快速旅行
                          </Button>
                      ) : (
                          <div className="px-8 py-3 bg-slate-800 text-cyan-400 font-bold border border-cyan-500/30 rounded">
                              <MapPin className="mr-2 inline" /> 當前位置
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
