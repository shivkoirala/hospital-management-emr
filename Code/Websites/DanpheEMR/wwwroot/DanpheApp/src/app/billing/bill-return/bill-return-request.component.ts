import { Component, ChangeDetectorRef } from "@angular/core";
import { Router } from '@angular/router';

import { BillingTransactionItem } from '../shared/billing-transaction-item.model';


import { BillReturnRequest } from '../shared/bill-return-request.model';
import { BillingTransaction } from '../shared/billing-transaction.model';

import { RouteFromService } from '../../shared/routefrom.service';

import { BillingBLService } from '../shared/billing.bl.service';
import { BillingService } from '../shared/billing.service';

import { MessageboxService } from '../../shared/messagebox/messagebox.service';
import { SecurityService } from '../../security/shared/security.service';
import { CallbackService } from '../../shared/callback.service';
import { PatientService } from '../../patients/shared/patient.service';
import { VisitService } from '../../appointments/shared/visit.service';

import { CommonFunctions } from '../../shared/common.functions';
import { BillingReceiptModel } from "../shared/billing-receipt.model";
import * as moment from 'moment/moment';
import { BillInvoiceReturnModel } from "../shared/bill-invoice-return.model";
import { HttpClient, HttpHeaders } from '@angular/common/http';//remove it while merging--sud:5May'18
import { BillingFiscalYear } from "../shared/billing-fiscalyear.model";
import { CoreService } from "../../core/shared/core.service";
import { Patient } from "../../patients/shared/patient.model";
import { DanpheHTTPResponse } from "../../shared/common-models";
import { ENUM_InvoiceType } from "../../shared/shared-enums";
@Component({
  templateUrl: "./bill-return-request.html" // "/BillingView/BillReturnRequest"
})
export class BillReturnRequestComponent {

  public selReceiptNo: number = 0;
  public billingReceipt: BillingReceiptModel = new BillingReceiptModel();
  public billTXNForNewReceipt: BillingTransaction = new BillingTransaction();
  public invoiceDetails: any = null;
  public displayReciept: boolean = false;
  public showReturnBtn: boolean = false;
  public returnRemarks: string = "";
  public showReturnPanel: boolean = false;
  public showPrintBtn: boolean = false;//print button will be enabled only after successfull return
  public allFiscalYrs: Array<BillingFiscalYear> = [];
  public currFiscalyr: BillingFiscalYear = null;
  public selFiscYrId: number = 2;//remove this hardcode later
  //added to avoid code-conflicts, remove it later on: sud-5May'18'

  public isMaxDischargeHours: boolean = false;
  public maxValidDischargeHrs: number = 0;
  public isReturnSuccessfull: boolean = false;
  public loading: boolean = false;
  public showIPReceipt: boolean = false;
  public showNormalReceipt: boolean = false;
  public doctorsList: Array<any> = [];
  public isInsuranceReceipt: boolean = true;
  public showReturnIPBill: boolean = false;
  public showPartialReturnedInvoice: boolean = false;
  public showReturnedInvoice: boolean = false;

  public showSelectCheckBox: boolean = true; //Rajesh:7Sept19
  public showPartialInvoiceNo: boolean = false; //Rajesh:9Sept19
  public enablePartialBillReturn: boolean = false; // Rajesh:12Sept19

  public ShowPrintCount: boolean = false;

  constructor(public BillingBLService: BillingBLService,
    public billingService: BillingService,
    public router: Router, public securityService: SecurityService,
    public routeFromService: RouteFromService,
    public changeDetector: ChangeDetectorRef,
    public msgBoxServ: MessageboxService,
    public callbackservice: CallbackService,
    public patientService: PatientService,
    public http: HttpClient,
    public coreService: CoreService,
    public visitService: VisitService

  ) {

    let counterId = this.securityService.getLoggedInCounter().CounterId;
    if (counterId < 1) {
      this.callbackservice.CallbackRoute = '/Billing/BillReturnRequest'
      this.router.navigate(['/Billing/CounterActivate']);
    }
    else {
      this.GetDoctorsList();
      this.GetAllFiscalYrs();
      this.SetCurrentFiscalYear();
    }
  }

  GetInvoiceByReceiptNo(receiptNo: number) {
    if (receiptNo != 0) {
      this.returnRemarks = ""; //to show remark box empty on each click for search invoice --yub 30th Aug '18
      let recptNo = parseInt(receiptNo.toString());
      this.showReturnBtn = false;
      let getVisitInfo = true;
      this.isReturnSuccessfull = false;
      this.loading = true;
      this.BillingBLService.GetInvoiceByReceiptNo(recptNo, this.selFiscYrId, getVisitInfo, this.isInsuranceReceipt)
        .subscribe(res => {
          if (res.Status == "OK" && res.Results) {
            //let receipt = res.Results;
            this.loading = false;
            this.selReceiptNo = 0;
            this.showPartialReturnedInvoice = false;
            this.invoiceDetails = res.Results;
            this.billingReceipt = BillingReceiptModel.GetReceiptForDuplicate(this.invoiceDetails);
            this.billTXNForNewReceipt = BillingReceiptModel.GetReceiptForGenerateNewReceipt(this.invoiceDetails);

            if (this.billingReceipt.IsInsuranceBilling) {
              this.billingService.BillingFlow = 'insurance';
            }

            for (let i = 0; i < this.billingReceipt.BillingItems.length; i++) {
              if (this.billingReceipt.BillingItems[i].RequestedBy) {
                let doctor = this.doctorsList.find(a => a.EmployeeId == this.billingReceipt.BillingItems[i].RequestedBy);
                if (doctor)
                  this.billingReceipt.BillingItems[i].RequestedByName = doctor.FullName;
              }
            }

            if (!this.invoiceDetails.Transaction.ReturnStatus) {
              this.showReturnPanel = true;
              this.CheckDischargeHrsValidReturn();
              this.displayReciept = false;
            }
            else {
              this.showReturnPanel = false;
              this.billingReceipt.IsReturned = true;
              this.displayReciept = true;
              this.enablePartialBillReturn = false;
            }

            //Hom 15 Dec' 2019
            if (this.invoiceDetails.Transaction.TransactionType.toLowerCase() == "inpatient" && this.invoiceDetails.Transaction.InvoiceType != ENUM_InvoiceType.inpatientPartial) {
              this.showIPReceipt = true;
              this.showNormalReceipt = false;
            }
            else {
              this.showIPReceipt = false;
              this.showNormalReceipt = true;
            }
            if (this.billingReceipt.PartialReturnTxnId !== null) {
              this.showPartialInvoiceNo = true;
            } else {
              this.showPartialInvoiceNo = false;
            }

          }
          else {
            //add messagebox here..
            this.msgBoxServ.showMessage("error", ["unable to fetch duplicate bill details. Pls try again later.."]);
            console.log(res.ErrorMessage);
            this.displayReciept = false;
            this.showReturnPanel = false;
            this.returnRemarks = "";
            this.loading = false;
            this.selReceiptNo = 0;
            //alert("unable to fetch duplicate bill details. Pls try again later..");
          }

          if (this.invoiceDetails.Transaction.ReturnStatus == true) {
            this.showSelectCheckBox = false;
          } else {
            this.showSelectCheckBox = true;
          }
          this.showPrintBtn = true;
          if (this.displayReciept != true) {
            //Rajesh:Logic for parameterized bill partial or full
            let enablePartialReturn = this.coreService.Parameters.find(a => a.ParameterGroupName == "BILL" &&
              a.ParameterName == "EnablePartialBillReturn").ParameterValue;
            if (enablePartialReturn == "true") {
              this.enablePartialBillReturn = true;
              this.changeDetector.detectChanges();
              this.showPartialReturnedInvoice = true;
            } else {
              this.enablePartialBillReturn = false;
              this.displayReciept = true;
              this.showSelectCheckBox = false;
            }
          }
        },
          err => {
            //add messagebox here..
            alert("unable to fetch duplicate bill details. Pls try again later..");
            console.log(err);
            this.loading = false;
            this.selReceiptNo = 0;
          });
    } else {
      this.msgBoxServ.showMessage('Failed', ["Your Receipt Number is not proper."]);
    }
  }

  public GetDoctorsList() {
    this.BillingBLService.GetDoctorsList()
      .subscribe(res => {
        if (res.Status == 'OK') {
          if (res.Results.length) {
            this.doctorsList = res.Results;
          }
          else {
            console.log(res.ErrorMessage);
          }
        }
      },
        err => {
          this.msgBoxServ.showMessage('Failed', ["unable to get Doctors list.. check log for more details."]);
          console.log(err.ErrorMessage);
        });
  }

  CheckDischargeHrsValidReturn() {
    this.isMaxDischargeHours = false;
    console.log(this.invoiceDetails)
    if (this.invoiceDetails.VisitInfo && this.invoiceDetails.VisitInfo.LastDischargedDate) {
      let dischargeTimeParameter = this.coreService.Parameters.find(par => par.ParameterGroupName == "BILL" && par.ParameterName == "BillReturnAfterDischargeHrs").ParameterValue;
      if (dischargeTimeParameter) {
        this.maxValidDischargeHrs = Number(JSON.parse(dischargeTimeParameter).MaxHours);
        var _currDate = moment().format('YYYY-MM-DD HH:mm');
        var _dischargeDate = moment(this.invoiceDetails.VisitInfo.LastDischargedDate).format('YYYY-MM-DD HH:mm');
        var _admissionDate = moment(this.invoiceDetails.VisitInfo.LastAdmissionDate).format('YYYY-MM-DD HH:mm');
        var _invoiceDate = moment(this.invoiceDetails.Transaction.CreatedOn).format('YYYY-MM-DD HH:mm');
        //moment(_invoiceDate).diff(_admissionDate) > 0
        if(moment(_invoiceDate) < moment(_admissionDate)){
          this.isMaxDischargeHours = false;
        }else if (moment(_dischargeDate).diff(_invoiceDate) >= 0
          && moment(_currDate).diff(_dischargeDate, 'hours') > this.maxValidDischargeHrs){
            this.isMaxDischargeHours = true;
        }
      }
      else {
        this.msgBoxServ.showMessage("failed", ["Please set core parameter for max discharge hours for valid bill return."]);
      }
    }
  }

  ReturnCurrentReciept() {
    if (this.returnRemarks && this.selFiscYrId > 0) {
      //alert("billreturned successfully");
      this.loading = false;
      if (!this.loading) {
        this.loading = true;

        if (this.enablePartialBillReturn != true) {
          this.billingReceipt.BillingItems.forEach(itm => {
            itm.IsSelected = true;
          });
        }

        //ashim: 22Aug2018 : moved MappingLogic to BillingBLService.
        this.BillingBLService.PostReturnReceipt(this.billingReceipt, this.billTXNForNewReceipt, this.returnRemarks)
          .subscribe(res => {
            if (res.Status == "OK") {

              //this.invoiceDetails.TransactionItems = res.Results.ReturnedItems;

              //this.billingReceipt = BillingReceiptModel.GetReceiptForDuplicate(this.invoiceDetails);
              //this.changeDetector.markForCheck();
              //this.billingReceipt.ReturnedItems = res.Results.ReturnedItems;
              //this.billingReceipt.BillingItems = [];
              this.billingReceipt.Remarks = res.Results.Remarks;
              this.billingReceipt.IsReturned = true;
              this.billingReceipt.BillingUser = this.securityService.GetLoggedInUser().UserName;
              this.billingReceipt.PartialReturnTxnId = res.Results.OnPartiaBilInvNo;
              if (this.billingReceipt.PartialReturnTxnId !== null) {
                this.showPartialInvoiceNo = true;
              }
              this.showReturnPanel = false;
              this.showPrintBtn = true;
              this.showSelectCheckBox = false;
              this.billingReceipt.CreditNoteNumber = res.Results.BillingReturnedData.CreditNoteNumber;
              this.billingReceipt.Remarks = this.returnRemarks;//for show return remark on the invoice.

              this.returnRemarks = "";
              console.log("CreditNoteNumber is: " + res.Results.BillingReturnedData.CreditNoteNumber);
              this.changeDetector.detectChanges();
              this.msgBoxServ.showMessage("success", ["Bill returned successfully.."]);
              this.isReturnSuccessfull = true;
            }
            else {
              this.msgBoxServ.showMessage("error", ["Couldn't return this bill. Please try again later"]);
            }
            this.loading = false;
          });
      }

    }
    else {
      this.msgBoxServ.showMessage("error", ["remarks is mandatory"]);
    }

  }

  CreateCopyOfCurrentReceipt() {
    this.patientService.setGlobal(this.invoiceDetails.Patient);
    //ashim: 29Sep2018
    if (this.invoiceDetails && this.invoiceDetails.LatestPatientVisitInfo) {
      this.patientService.globalPatient.LatestVisitCode = this.invoiceDetails.LatestPatientVisitInfo.LatestVisitCode;
      this.patientService.globalPatient.LatestVisitId = this.invoiceDetails.LatestPatientVisitInfo.LatestVisitId;
      this.patientService.globalPatient.LatestVisitType = this.invoiceDetails.LatestPatientVisitInfo.LatestVisitType;
    }
    else {
      this.patientService.globalPatient.LatestVisitType = "outpatient";
    }

    let txn = this.billingService.CreateNewGlobalBillingTransaction();
    this.invoiceDetails.TransactionItems.forEach(item => {
      //we were not getting validation instance when assigned directly.
      let billItem = new BillingTransactionItem();
      billItem = Object.assign(billItem, item);
      //sud:10Nov'19-- need to set BillingTransaction to null else it'll create new invoices--
      //when user creates provisional receipt(from billingtransaction page) after copy - earlier items.
      billItem.BillingTransaction = null;
      billItem.BillingTransactionItemId = 0;
      billItem.BillingTransactionId = null;
      billItem.ReturnQuantity = null;
      billItem.ReturnStatus = null;
      billItem.CreatedBy = null;
      billItem.CreatedOn = null;
      billItem.PaidDate = null;
      billItem.CounterId = null;
      billItem.CounterDay = null;
      txn.BillingTransactionItems.push(billItem);
    });
    txn.PatientId = this.invoiceDetails.Patient.PatientId;
    txn.PatientVisitId = this.invoiceDetails.Transaction.PatientVisitId;
    txn.PaymentMode = this.invoiceDetails.Transaction.PaymentMode;
    txn.PaymentDetails = this.invoiceDetails.Transaction.PaymentDetails;
    txn.DiscountPercent = this.invoiceDetails.Transaction.DiscountPercent;
    txn.PatientId = this.invoiceDetails.Transaction.PatientId;
    txn.PatientVisitId = this.invoiceDetails.Transaction.PatientVisitId;
    txn.Remarks = this.invoiceDetails.Transaction.Remarks;
    txn.PackageId = this.invoiceDetails.Transaction.PackageId;
    txn.PackageName = this.invoiceDetails.Transaction.PackageName;
    txn.TransactionType = this.invoiceDetails.Transaction.TransactionType;
    txn.IsCopyReceipt = true;
    txn.BillingTransactionId = 0;
    this.billingService.BillingType = this.invoiceDetails.Transaction.TransactionType;
    this.routeFromService.RouteFrom = "BillReturn";
    this.router.navigate(['/Billing/BillingTransaction']);
    console.log(this.billingService.getGlobalBillingTransaction());
  }

  ShowReturnChkOnClick() {
    if (this.showIPReceipt == true) {
      this.msgBoxServ.showMessage("NOTE!!! This is Discharged Receipt", ["Go To ADT for DISCHARGE CANCEL to return this receipt"]);
      this.showReturnIPBill = true;
    }
    else
      this.showReturnIPBill = false;

    this.showReturnBtn = !this.showReturnBtn;
    //if (this.showReturnBtn) {
    //}
  }


  GetAllFiscalYrs() {
    this.BillingBLService.GetAllFiscalYears()
      .subscribe(res => {
        if (res.Status == "OK") {
          this.allFiscalYrs = res.Results;
        }
      });
  }


  SetCurrentFiscalYear() {
    //We may do this in client side itself since we already have list of all fiscal years with us. [Part of optimization.]

    this.BillingBLService.GetCurrentFiscalYear()
      .subscribe((res: DanpheHTTPResponse) => {
        if (res.Status == "OK") {
          let fiscYr: BillingFiscalYear = res.Results;
          if (fiscYr) {
            this.selFiscYrId = fiscYr.FiscalYearId;
          }
        }
      });
  }


}
