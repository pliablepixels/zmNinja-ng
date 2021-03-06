/*
  ZONEMINDER wrapper for Auth services. 

*/


import { Injectable } from '@angular/core';
import { Http , URLSearchParams, RequestOptions, Headers} from '@angular/http';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';
import {constants} from '../../../constants/constants';
import {CameraServiceProvider, Camera} from '../../../providers/camera-service/camera-service';
import {CommonUtilsProvider} from '../../../providers/common-utils/common-utils';
import {AuthServiceProvider} from '../../../providers/auth-service/auth-service';
import {ServerProfileProvider, ServerProfile} from '../../../providers/server-profile/server-profile'


@Injectable()
export class ZmCameraServiceProvider extends CameraServiceProvider {
  constructor(public http: Http, public utils:CommonUtilsProvider, public auth:AuthServiceProvider) {
    super(http);
    console.log('Hello ZMCameraServiceProvider Provider');
   
  }


  refreshCameraUrls(cameras) {
    let re = /&connkey=([0-9]*)&/;
    cameras.forEach (item => {
      let new_connkey_val= this.utils.getRandomTimeVal();
      let new_connkey = "&connkey="+new_connkey_val+"&";
      let tstr = item.streamingURL.replace(re,new_connkey);
      item.streamingURL = tstr;
      item.connkey = new_connkey_val;
      console.log (`updating ${item.name} with ${item.connkey}`);

    })
  }
  

  getCameras(sp:ServerProfile): Promise <Camera[]> {
    return new Promise((resolve,reject) => {
      let cameras:Camera[] = [];
      let url = sp.apiUrl;
      this.http.get (url+'/monitors.json', {withCredentials:true})
      .map (res => res.json())
      .toPromise()
      .then ( succ => {
        succ.monitors.forEach (item => {
          //let connkey = this.utils.getRandomVal(10000,50000);
          let streamConnkey = this.utils.getRandomTimeVal();
          let basepath = sp.portalUrl+"/cgi-bin/nph-zms?maxfps=5&buffer=1000"+this.auth.getAuthKey();
          let streamingUrl=`${basepath}&mode=jpeg&monitor=${item.Monitor.Id}&connkey=${streamConnkey}&scale=50`;
          let snapConnkey = this.utils.getRandomTimeVal();
          let snapshotUrl=`${basepath}&mode=single&monitor=${item.Monitor.Id}&connkey=${snapConnkey}&scale=50`;

          let tempItem:Camera = {
            name:item.Monitor.Name,
            id:item.Monitor.Id,
            streamingURL: streamingUrl,
            snapshotURL: snapshotUrl,
            mode: item.Monitor.Function,
            connkey: streamConnkey,
            controllable: item.Monitor.Controllable == '1' ? true:false,
            width:item.Monitor.Width,
            height:item.Monitor.Height,
            //placeholder:`holder.js/${item.Monitor.Width}x${item.Monitor.Height}/auto`
            //placeholder:"holder.js/200x300/auto"

          }
          this.utils.verbose("PUSHING "+JSON.stringify(tempItem));
          cameras.push (tempItem);

        }) //forEach
        resolve (cameras)
      }) //then

    });
  }

  

  killStream (camera, sp:ServerProfile) {
 
    let cmd= {
      view:'request',
      request:'stream',
      connkey:camera.connkey,
      command:17
    };
    return this.sendCommand (cmd, camera, sp);
  }

  startStream (camera, sp:ServerProfile) {
    this.utils.info ("restarting stream for:"+camera.name);
    let streamConnkey = this.utils.getRandomTimeVal();
    let basepath = sp.portalUrl+"/cgi-bin/nph-zms?maxfps=5&buffer=1000"+this.auth.getAuthKey();
    let streamingUrl=`${basepath}&mode=jpeg&monitor=${camera.id}&connkey=${streamConnkey}&scale=50`;
    let snapConnkey = this.utils.getRandomTimeVal();
    let snapshotUrl=`${basepath}&mode=single&monitor=${camera.id}&connkey=${snapConnkey}&scale=50`;
    camera.streamingUrl = streamingUrl;
    camera.snapshotUrl = snapshotUrl;
    camera.connkey = streamConnkey;

  }

  sendCommand( cmd:any, camera:Camera, sp:ServerProfile): Promise <any> {
    this.utils.info ("sending control command:"+cmd);
    let headers = new Headers({
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    let options = new RequestOptions( {headers:headers, withCredentials: true });
    let data = new URLSearchParams();
  
    Object.keys(cmd).forEach ( key => {
      let val = cmd[key];
      console.log ("Appending "+key+":" +val);
      data.append (key,val);
    });

   
    console.log ("appending kill data " + data.toString());
    
    //console.log ("url="+credentials.url);


    return this.http.post (sp.portalUrl+'/index.php',data, options)
    .toPromise()


  }



}
