# Genera geo.js: puntos de tierra para el globo y contorno de Colombia (fuente: world.geo.json, Natural Earth)
# Uso: python3 -I geo.py ruta/countries.geo.json
import json, sys, os
import numpy as np
G=json.load(open(sys.argv[1])); polys=[]; col=[]
for f in G['features']:
    g=f['geometry']; P=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    for p in P:
        polys.append(np.array(p[0],float))
        if f.get('id')=='COL': col.append(p[0])
def inside(px,py,pg):
    x,y=pg[:,0],pg[:,1]; x2,y2=np.roll(x,-1),np.roll(y,-1); r=np.zeros(len(px),bool)
    for i in range(len(x)):
        r^=((y[i]>py)!=(y2[i]>py))&(px<(x2[i]-x[i])*(py-y[i])/(y2[i]-y[i]+1e-12)+x[i])
    return r
pts=[]
for k,lat in enumerate(np.arange(-56,80,2.2)):
    lons=np.arange(-180+(k%2)*1.1,180,2.2/max(np.cos(np.radians(lat)),.25)); la=np.full(len(lons),lat); land=np.zeros(len(lons),bool)
    for pg in polys:
        m=(lons>=pg[:,0].min())&(lons<=pg[:,0].max())&(lat>=pg[:,1].min())&(lat<=pg[:,1].max())
        if m.any(): land[m]|=inside(lons[m],la[m],pg)
    pts+=[[round(a,1),round(lat,1)] for a in lons[land]]
col=max(col,key=len)
out='window.LAND='+json.dumps(pts,separators=(',',':'))+';\nwindow.COL='+json.dumps([[round(a,2),round(b,2)] for a,b in col],separators=(',',':'))+';\n'
open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'geo.js'),'w').write(out)
print('tierra',len(pts),'colombia',len(col))
