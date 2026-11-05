import type Phaser from 'phaser';
/** Height-field normals, encoded for Phaser's screen-space Light2D pipeline. */
export function normalPixels(width:number,height:number,heights:Float32Array):Uint8ClampedArray{
 const result=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const dx=(heights[y*width+Math.max(0,x-1)]-heights[y*width+Math.min(width-1,x+1)])*.5,dy=(heights[Math.min(height-1,y+1)*width+x]-heights[Math.max(0,y-1)*width+x])*.5,n=Math.hypot(dx,dy,1),i=(y*width+x)*4;
  result[i]=Math.round((dx/n*.5+.5)*255);result[i+1]=Math.round((dy/n*.5+.5)*255);result[i+2]=Math.round((1/n*.5+.5)*255);result[i+3]=255;
 }
 return result;
}
export function attachNormals(scene:Phaser.Scene,key:string,width:number,height:number,sample:(x:number,y:number)=>number):void{
 const heights=new Float32Array(width*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++)heights[y*width+x]=sample(x,y);
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d')!,data=c.createImageData(width,height);data.data.set(normalPixels(width,height,heights));c.putImageData(data,0,0);scene.textures.get(key).setDataSource(canvas);
}
export function lightSurface<T extends Phaser.GameObjects.Image>(image:T):T{if(image.scene.game.renderer.type===2)image.setPipeline('Light2D');return image;}
