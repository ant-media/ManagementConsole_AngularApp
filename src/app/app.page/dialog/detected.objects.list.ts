import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Inject,
    Input,
    NgZone,
    OnDestroy,
    OnInit,
    Output,
    Renderer,
    ViewChild
} from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialog,
    MatDialogRef,
    MatPaginatorIntl,
    MatSort,
    MatTableDataSource,
    PageEvent
} from '@angular/material';
import {HTTP_SERVER_ROOT, LiveBroadcast, RestService, SERVER_ADDR} from '../../rest/rest.service';
declare var $: any;
export class DetectedObject {
    objectName: String;
    probability: Number;
    detectionTime: Number;
}

export class DetectedObjectTable {
    dataRows: DetectedObject[];
}

@Component({
    selector: 'detected-objects-list',
    templateUrl: 'detected.objects.list.html',
})

export class DetectedObjectListDialog {

    public dataSource: MatTableDataSource<DetectedObjectTable>;

    public appName: string;

    public timerId: any;

    public displayedColumnsStreams = ['image'];

    constructor(
        public dialogRef: MatDialogRef<DetectedObjectListDialog>, public restService: RestService,
                    @Inject(MAT_DIALOG_DATA) public data: any) {
            this.dataSource = new MatTableDataSource<DetectedObjectTable>();
            


            this.appName = data.appName;
            this.getDetectionList(this.appName, data.streamId, 0, 100); 
            
            this.timerId = window.setInterval(() => {
                this.getDetectionList(this.appName, data.streamId, 0, 100);

            }, 3000); 
            
            this.dialogRef.afterClosed().subscribe(result => {
                clearInterval(this.timerId);
            })
    }

    getDetectionList(appName:string, streamId:string, offset:number, batch:number) {
        this.restService.getDetectionList(appName, streamId, offset, batch).subscribe(data => 
            {
                this.dataSource = null;
                var dataRows = [];
                for (var i in data) {
                    dataRows.push(data[i]);
                }

                this.dataSource = new MatTableDataSource(dataRows);
            });
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    getImageURL(imageId: string) : string {
        return HTTP_SERVER_ROOT + this.appName+'/previews/'+ imageId +'.jpeg';
    }


}