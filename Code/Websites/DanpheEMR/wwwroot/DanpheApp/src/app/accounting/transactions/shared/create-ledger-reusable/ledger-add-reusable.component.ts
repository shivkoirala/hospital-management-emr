
import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from "@angular/core";
import { AccountingSettingsBLService } from '../../../settings/shared/accounting-settings.bl.service';
import { AccountingBLService } from '../../../shared/accounting.bl.service';
import { ledgerGroupModel } from '../../../settings/shared/ledgerGroup.model';
import { LedgerModel } from '../../../settings/shared/ledger.model';
import { SecurityService } from '../../../../security/shared/security.service';
import * as moment from 'moment/moment';
import { MessageboxService } from '../../../../shared/messagebox/messagebox.service';

@Component({
    selector: 'ledger-add-reusable',
    templateUrl: './ledger-add-reusable.html'
})
export class LedgersAddReusableComponent {


    @Output("callback-add")
    callbackAdd: EventEmitter<Object> = new EventEmitter<Object>();
    public CurrentLedger: LedgerModel;
    public selLedgerGroup: any;
    public showAddLedgerGroupPopUp: boolean = false;

    loading: boolean = false;
    public completeledgerList: Array<LedgerModel> = new Array<LedgerModel>();
    public ledgerList: Array<LedgerModel> = new Array<LedgerModel>();
    public primaryGroupList: any[];
    public coaList: any[];
    public update: boolean;
    public ledgergroupList: Array<LedgerModel> = new Array<LedgerModel>();
    public sourceLedGroupList: Array<LedgerModel> = new Array<LedgerModel>();
    public sourceLedgerList: Array<LedgerModel> = new Array<LedgerModel>();
    public butDisabled: boolean = true;
    public Dr: boolean;
    public Cr: boolean;
    public ledgerType: string;

    public typeledger: any = true;
    public typesupplier: any = false;
    public typevendor: any = false;
    
    public phrmSupplierList: any;
    public ledgerMappingList: any;
    constructor(public accountingSettingsBLService: AccountingSettingsBLService,
        public securityService: SecurityService,
        public changeDetector: ChangeDetectorRef,
        public msgBoxServ: MessageboxService,
        public accountingBLService: AccountingBLService) {

    }

    ngOnInit() {
        this.GetLedgerGroup();
        this.getLedgerList();

        //this.showAddPage = val;
        this.Cr = this.Dr = null;
        this.ledgerType = 'ledger';
        this.loading = false;
        this.typeledger = true;
        this.typesupplier = false;
        this.typevendor = false;

        this.update = false;
        this.CurrentLedger = new LedgerModel();
        this.CurrentLedger.CreatedBy = this.securityService.GetLoggedInUser().EmployeeId;

    }


    GetLedgerGroup() {
        this.accountingSettingsBLService.GetLedgerGroup()
            .subscribe(res => this.CallBackLedgerGroup(res));
    }

    CallBackLedgerGroup(res) {
        this.sourceLedGroupList = new Array<LedgerModel>();
        this.sourceLedGroupList = res.Results;
        this.ledgergroupList = [];
        this.primaryGroupList = [];
        this.coaList = [];
        this.ledgerList = new Array<LedgerModel>();
        this.primaryGroupList = Array.from([new Set(this.sourceLedGroupList.map(i => i.PrimaryGroup))][0]);
    }
    //adding new Ledger
    AddLedger() {
        if (this.checkUniqueLedgerName()) {
            this.CheckDrCrValidation();
            //for checking validations, marking all the fields as dirty and checking the validity.
            for (var i in this.CurrentLedger.LedgerValidator.controls) {
                this.CurrentLedger.LedgerValidator.controls[i].markAsDirty();
                this.CurrentLedger.LedgerValidator.controls[i].updateValueAndValidity();
            }
            if (this.CurrentLedger.IsValidCheck(undefined, undefined) && this.CheckLedgerTypeValidation()) {
                this.loading = true;

                ///During First Time Add Current Balance and Opening Balance is Equal                 
                this.accountingSettingsBLService.AddLedgers(this.CurrentLedger)
                    .subscribe(
                        res => {
                            if (res.Status == "OK") {
                                this.msgBoxServ.showMessage("success", ["Ledger Added"]);
                                // this.CurrentLedger
                                this.CallBackAddLedger(res);
                                this.CurrentLedger = new LedgerModel();
                                this.selLedgerGroup = null; ////Null the Selected Ledger Group 
                                this.loading = false;
                            }
                            else {
                                this.msgBoxServ.showMessage("error", ["Duplicate ledger not allowed"]);
                                this.loading = false;
                            }
                        },
                        err => {
                            this.logError(err);
                            this.loading = false;
                        });
            } else {
                this.loading = false;
            }
        }
    }

    Close() {
        this.ledgerList = this.completeledgerList;
        this.CurrentLedger = new LedgerModel();
        this.selLedgerGroup = null;

        this.ledgergroupList = new Array<LedgerModel>();
        this.coaList = [];
        this.ledgerList = new Array<LedgerModel>();

        this.callbackAdd.emit({ action: "close" });//

    }

    //after adding Ledger is succesfully added  then this function is called.
    CallBackAddLedger(res) {
        if (res.Status == "OK" && res.Results != null) {
            let retLedgerObj = new LedgerModel();
            retLedgerObj = Object.assign(retLedgerObj, res.Results);
            retLedgerObj.PrimaryGroup = this.CurrentLedger.PrimaryGroup;
            retLedgerObj.COA = this.CurrentLedger.COA;
            retLedgerObj.LedgerGroupId = this.CurrentLedger.LedgerGroupId;
            retLedgerObj.LedgerGroupName = this.CurrentLedger.LedgerGroupName;
            retLedgerObj.LedgerName = this.CurrentLedger.LedgerName;
      
            //this.showAddPage = false;
            this.ledgergroupList = new Array<LedgerModel>();
            this.ledgerList = new Array<LedgerModel>();

            this.callbackAdd.emit({ action: "add", data: retLedgerObj });//we will return the ledgerobject which was created here.
        }
        else if (res.Status == "OK" && res.Results == null) {
            this.msgBoxServ.showMessage("notice-message", ["Ledger under LedgerGroup already exist.Please deactivate the previous ledger to add a new one with same name"]);
        }
        else {
            this.msgBoxServ.showMessage("error", ["Check log for details"]);
            console.log(res.ErrorMessage);
        }
    }
    logError(err: any) {
        console.log(err);
    }

    CheckProperSelectedLedger(selLedgerGroup) {
        try {
            for (var i = 0; i < this.ledgergroupList.length; i++) {
                if (this.ledgergroupList[i].LedgerGroupId == selLedgerGroup.LedgerGroupId) {
                    this.CurrentLedger.checkSelectedLedger = false;
                    break;
                }
                else {
                    ////if LedgerGroupId is Undefined meanse Wrong Ledger Is Selected
                    if (selLedgerGroup.LedgerGroupId == undefined) {
                        this.CurrentLedger.checkSelectedLedger = true;
                        break;
                    }
                }
            }
        }
        catch (exception) {
            this.ShowCatchErrMessage(exception);
        }
    }
    ShowCatchErrMessage(exception) {
        if (exception) {
            let ex: Error = exception;
            console.log("Error Messsage =>  " + ex.message);
            console.log("Stack Details =>   " + ex.stack);
        }
    }
    public AssignSelectedLedgerGroup() {
        if (this.CurrentLedger.LedgerGroupName) {
            this.selLedgerGroup = this.ledgergroupList.filter(s => s.LedgerGroupName == this.CurrentLedger.LedgerGroupName)[0];
            if ((this.selLedgerGroup.LedgerGroupId != 0) && (this.selLedgerGroup.LedgerGroupId != null)) {
                this.CurrentLedger.LedgerGroupId = this.selLedgerGroup.LedgerGroupId;
                this.CurrentLedger.LedgerGroupName = this.selLedgerGroup.LedgerGroupName;
                this.ledgerList = new Array<LedgerModel>();
                this.CurrentLedger.LedgerId = 0;
                this.CurrentLedger.LedgerName = null;
                this.ledgerList = this.sourceLedgerList.filter(a => a.LedgerGroupName == this.CurrentLedger.LedgerGroupName);
            }
        }
    }
    public PrimaryGroupChanged() {
        if (this.CurrentLedger.PrimaryGroup) {
            this.coaList = [];
            this.ledgergroupList = [];
            this.selLedgerGroup = null;
            this.CurrentLedger.LedgerGroupName = null;
            this.CurrentLedger.LedgerName = null;
            this.ledgerList = new Array<LedgerModel>();
            let selectedPrimaryGroupList = this.sourceLedGroupList.filter(a => a.PrimaryGroup == this.CurrentLedger.PrimaryGroup);
            this.coaList = Array.from([new Set(selectedPrimaryGroupList.map(i => i.COA))][0]);
            this.CurrentLedger.COA = this.coaList[0];
            this.COAChanged();
        }
    }

    public COAChanged() {
        if (this.CurrentLedger.COA) {
            this.ledgergroupList = [];
            this.selLedgerGroup = null;
            this.CurrentLedger.LedgerGroupName = null;
            this.CurrentLedger.LedgerName = null;
            this.ledgerList = new Array<LedgerModel>();
            this.ledgergroupList = this.sourceLedGroupList.filter(a => a.COA == this.CurrentLedger.COA);
        }
    }
    public CheckDuplicateLedger() {
        if (this.CurrentLedger.LedgerName && this.update == false) {
            this.changeDetector.detectChanges();
            let count = this.sourceLedgerList.filter(s => s.LedgerName == this.CurrentLedger.LedgerName).length;
            if (count > 0) {
                this.CurrentLedger.LedgerName = null;
                this.msgBoxServ.showMessage("notice", ['duplicate ledger not allowed']);
            }
        }
    }
    public getLedgerList() {
        this.accountingSettingsBLService.GetLedgerList()
            .subscribe(res => {
                if (res.Status == "OK") {
                    this.sourceLedgerList = res.Results;
                }
                else {
                    alert("Failed ! " + res.ErrorMessage);
                }

            });
    }
    LedgerGroupListFormatter(data: any): string {
        return data["LedgerGroupName"];
    }
    LedgerListFormatter(data: any): string {
        return data["LedgerName"];
    }

    ChangeOpeningBalType(e) {
        this.loading = false;
        if (e.target.name == "Dr") {
            if (e.target.checked) {
                this.CurrentLedger.DrCr = true;
                this.Cr = false;
                this.Dr = true;
            }
        }
        if (e.target.name == "Cr") {
            if (e.target.checked) {
                this.CurrentLedger.DrCr = false;
                this.Dr = false;
                this.Cr = true;
            }
        }
    }

    CheckDrCrValidation() {
        //if Opening balance is greater than 0 then add required validation to opening balance type
        if (this.CurrentLedger.OpeningBalance > 0) {
            //set validator on
            this.CurrentLedger.UpdateValidator("on", "Dr", "required");
            this.CurrentLedger.UpdateValidator("on", "Cr", "required");
        }
        else {
            //set validator off
            this.CurrentLedger.UpdateValidator("off", "Dr", "required");
            this.CurrentLedger.UpdateValidator("off", "Cr", "required");
        }
    }

    //below code for create new ledger from pharmacy supplier and inventory vendor
    GetPharmacySupplierList() {
        this.accountingSettingsBLService.GetPharmacySupplier()
            .subscribe(res => {
                if (res.Status == "OK") {
                    this.phrmSupplierList = res.Results;
                }
            });
    }

    GetLedgerMapping() {
        this.accountingBLService.GetLedgerMappingDetails()
            .subscribe(res => {
                if (res.Status == "OK") {
                    this.ledgerMappingList = res.Results;
                }
            });
    }
    SupplierListFormatter(data: any): string {
        return data["SupplierName"];
    }
    
    SetSupplierData() {
        this.GetLedgerMapping();
        this.GetPharmacySupplierList();
        let supplierLedger = this.sourceLedGroupList.find(a => a.Name == 'LCL_SUNDRY_CREDITORS');
        let selectedPrimaryGroupList = this.sourceLedGroupList.filter(a => a.PrimaryGroup == supplierLedger.PrimaryGroup);

        this.coaList = Array.from([new Set(selectedPrimaryGroupList.map(i => i.COA))][0]);
        this.ledgergroupList = this.sourceLedGroupList.filter(a => a.COA == supplierLedger.COA);

        this.CurrentLedger.PrimaryGroup = supplierLedger.PrimaryGroup;
        this.CurrentLedger.COA = supplierLedger.COA;
        this.CurrentLedger.LedgerGroupName = supplierLedger.LedgerGroupName;
    }
    CheckDuplicateSupplierLedger() {
        if (this.CurrentLedger.LedgerName) {
            this.changeDetector.detectChanges();
            let led = this.ledgerMappingList.supplier.find(s => s.LedgerName == this.CurrentLedger.LedgerName);
            if (led) {
                this.CurrentLedger.LedgerName = null;
                this.msgBoxServ.showMessage("notice", ['duplicate ledger not allowed']);
            }
        }
    }
    CheckLedgerTypeValidation() {
        if (this.ledgerType != 'ledger') {
            if (this.ledgerType == 'pharmacysupplier') {
                let supp = this.phrmSupplierList.find(s => s.SupplierName == this.CurrentLedger.LedgerName);
                if (!supp) {
                    this.CurrentLedger.LedgerName = null;
                    this.msgBoxServ.showMessage("notice", ['ledger not allowed']);
                    return false;
                } else {
                    this.CurrentLedger.LedgerType = this.ledgerType;
                    this.CurrentLedger.LedgerReferenceId = supp.SupplierId;
                    this.CurrentLedger.LedgerName = supp.SupplierName;
                }
            }
        }
        return true;
    }


    //for Ledger Group add popup
    AddLedgerGroupPopUp() {
        this.showAddLedgerGroupPopUp = false;
        this.changeDetector.detectChanges();
        this.showAddLedgerGroupPopUp = true;
    }
    OnNewLedgerGroupAdded($event) {
        this.showAddLedgerGroupPopUp = false;
        var ledgerGroup = new LedgerModel();
        ledgerGroup.LedgerGroupId = $event.currentLedger.LedgerGroupId;
        ledgerGroup.PrimaryGroup = $event.currentLedger.PrimaryGroup;
        ledgerGroup.COA = $event.currentLedger.COA;
        ledgerGroup.LedgerGroupName = $event.currentLedger.LedgerGroupName;
        ledgerGroup.IsActive = $event.currentLedger.IsActive;
        ledgerGroup.Description = $event.currentLedger.Description;
        ledgerGroup.Name = $event.currentLedger.Name;
        this.ledgergroupList.push(ledgerGroup);
        this.ledgergroupList = this.ledgergroupList.slice();
        this.GetLedgerGroup();
    }
    checkUniqueLedgerName() {
        if (this.CurrentLedger.LedgerName) {
            this.changeDetector.detectChanges();
            let count = this.sourceLedgerList.filter(s => s.LedgerName == this.CurrentLedger.LedgerName).length;
            if (count > 0) {
                this.msgBoxServ.showMessage("notice", ['duplicate ledger not allowed']);
                this.loading = false;
                return false;
            }
            else return true;
        }
        else {
            this.msgBoxServ.showMessage("notice", ['LedgerName required.']);
            this.loading = false;
        }
    }
}
