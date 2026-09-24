import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from pathlib import Path
import subprocess

OUT = Path("chatarra-v6-dist/media")
FRAMES = Path(".tmp-chatarra-frames")
OUT.mkdir(parents=True, exist_ok=True)
FRAMES.mkdir(parents=True, exist_ok=True)

def cuboid(origin, size):
    x,y,z = origin
    dx,dy,dz = size
    p=np.array([[x,y,z],[x+dx,y,z],[x+dx,y+dy,z],[x,y+dy,z],
                [x,y,z+dz],[x+dx,y,z+dz],[x+dx,y+dy,z+dz],[x,y+dy,z+dz]])
    return [[p[i] for i in q] for q in ([0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7])]

def add_box(ax, origin, size, shades):
    ax.add_collection3d(Poly3DCollection(
        cuboid(origin,size), facecolors=shades,
        edgecolors=(.82,.86,.83,.45), linewidths=.5))

steel=[(.78,.81,.78,1),(.35,.39,.36,1),(.55,.59,.56,1),(.22,.25,.23,1),(.66,.69,.66,1),(.30,.33,.31,1)]
N=72
for i in range(N):
    fig=plt.figure(figsize=(6,6),dpi=120,facecolor="#161917")
    ax=fig.add_subplot(111,projection="3d")
    ax.set_facecolor("#161917")
    add_box(ax,(-2.7,-.65,-.65),(5.4,1.3,1.3),steel)
    add_box(ax,(-.65,-2.5,-2.0),(1.3,5.0,4.0),[steel[2],steel[0],steel[3],steel[4],steel[1],steel[5]])
    add_box(ax,(-2.1,-.38,1.15),(4.2,.76,.76),[steel[4],steel[1],steel[5],steel[0],steel[3],steel[2]])
    u=np.linspace(0,2*np.pi,90); v=np.linspace(0,2*np.pi,20); U,V=np.meshgrid(u,v)
    R=2.25; r=.18
    X=(R+r*np.cos(V))*np.cos(U); Y=(R+r*np.cos(V))*np.sin(U); Z=r*np.sin(V)
    a=np.deg2rad(17); z=np.deg2rad(-12)
    Rx=np.array([[1,0,0],[0,np.cos(a),-np.sin(a)],[0,np.sin(a),np.cos(a)]])
    Rz=np.array([[np.cos(z),-np.sin(z),0],[np.sin(z),np.cos(z),0],[0,0,1]])
    pts=np.stack([X,Y,Z],axis=-1) @ (Rz@Rx).T
    ax.plot_surface(pts[...,0],pts[...,1],pts[...,2],linewidth=0,antialiased=True,shade=True,color=(.69,.36,.19,1))
    t=np.linspace(-1.6,1.6,150)
    ax.plot(2.2*np.sin(t),1.4*np.cos(t)-.2,.9*t,linewidth=3.0,color=(.78,.45,.28,1),alpha=.95)
    ax.view_init(elev=20+3*np.sin(2*np.pi*i/N),azim=25+360*i/N)
    ax.set_xlim(-3.8,3.8); ax.set_ylim(-3.8,3.8); ax.set_zlim(-3.6,3.6)
    ax.set_box_aspect((1,1,1)); ax.set_axis_off()
    fig.subplots_adjust(left=0,right=1,bottom=0,top=1)
    fig.savefig(FRAMES/f"{i:04d}.png",facecolor=fig.get_facecolor(),pad_inches=0)
    plt.close(fig)

subprocess.run([
    "ffmpeg","-y","-framerate","24","-i",str(FRAMES/"%04d.png"),
    "-c:v","libx264","-pix_fmt","yuv420p","-crf","23","-preset","medium",
    "-movflags","+faststart",str(OUT/"scrap-3d-loop.mp4")
],check=True)
print(OUT/"scrap-3d-loop.mp4")
