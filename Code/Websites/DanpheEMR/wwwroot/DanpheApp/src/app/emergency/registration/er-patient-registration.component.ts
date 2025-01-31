import { Component, ChangeDetectorRef, EventEmitter, Output, OnInit, Input } from '@angular/core';
import { MessageboxService } from '../../shared/messagebox/messagebox.service';
import { CoreService } from '../../core/shared/core.service';
import { EmergencyPatientModel } from '../shared/emergency-patient.model';
import { CommonFunctions } from '../../shared/common.functions';
import { EmergencyBLService } from '../shared/emergency.bl.service';
import { EmergencyDLService } from '../shared/emergency.dl.service';
import { DanpheHTTPResponse } from '../../shared/common-models';
import { PatientService } from '../../patients/shared/patient.service';
import * as moment from 'moment/moment';
import { ModeOfArrivalModel } from '../shared/ModeOfArrival.model';

@Component({
  selector: 'er-patient-registration',
  templateUrl: './er-patient-registration.html'
})

// App Component class
export class ERPatientRegistrationComponent {
  public loading: boolean = false;
  public addNewUnknownERPatient: boolean = false;
  public defaultLoad: boolean = true;

  public ERPatient: EmergencyPatientModel = new EmergencyPatientModel();
  public ERPatientNumber: number = null;
  public CountrySubDivisionList: any;
  public selDistrict;
  public calType: string = "";
  public Countries: any = null;

  public update: boolean = false;
  public isPoliceCaseState: boolean = false;

  public erServiceDepartmentName: string = null;

  public ModeOfArrivalList: Array<ModeOfArrivalModel> = new Array<ModeOfArrivalModel>();
  public SelectedModeOfArrival: any = null;

  @Output("sendBackERPatientData") sendERPatientData: EventEmitter<object> = new EventEmitter<object>();
  @Input("currentPatientToEdit") currentERPatient: EmergencyPatientModel = null;
  @Input("selectionFromExisting") selectionFromExistingPatient: boolean = false;

  public matchingPatientList: Array<any> = [];
  public showMatchingPatientList: boolean = false;

  constructor(public changeDetector: ChangeDetectorRef,
    public msgBoxServ: MessageboxService, public emergencyBLService: EmergencyBLService,
    public emergencyDLService: EmergencyDLService, public patientService: PatientService,
    public coreService: CoreService) {
    this.GetERPatNumAndModeOfArrival();
    this.InitializeData();
    this.LoadCalendarTypes();
    this.LoadCountryList();
  }

  ngOnInit() {
    this.erServiceDepartmentName = this.coreService.GetERDepartmentName();
    if (this.selectionFromExistingPatient) {      
      if (this.currentERPatient && this.currentERPatient.PatientId && !this.currentERPatient.PatientVisitId) {
        if (this.currentERPatient.Age && this.currentERPatient.Age != null
          && (this.currentERPatient.Age.includes("Y") || this.currentERPatient.Age.includes("M") || this.currentERPatient.Age.includes("D"))) {
          this.SplitAgeAndUnitFromInputPatient(this.currentERPatient);
        }
        this.update = false;
        this.ERPatient.EnableControl("FirstName", false);
        this.ERPatient.EnableControl("Gender", false);
        this.InitializeDataSelected();
      }
    }
    else {
      if (this.currentERPatient && this.currentERPatient.PatientId && this.currentERPatient.PatientVisitId) {
        if (this.currentERPatient.Age && this.currentERPatient.Age != null) {
          this.SplitAgeAndUnitFromInputPatient(this.currentERPatient);
        }
        this.update = true;
        if (this.currentERPatient.IsExistingPatient) {
          this.changeDetector.detectChanges();
          //this.ERPatient.ERPatientValidator.controls["FirstName"].setValue(this.currentERPatient.FirstName);
          //this.ERPatient.ERPatientValidator.controls["Gender"].setValue(this.currentERPatient.Gender);
          this.ERPatient.EnableControl("FirstName", false);
          this.ERPatient.EnableControl("Gender", false);
        }
        this.InitializeDataSelected();
      }
      else {
        this.update = false;
        this.ERPatient = new EmergencyPatientModel();
        this.ERPatient.DateOfBirth = moment().format('YYYY-MM-DD');
        this.ERPatient.Age = "0";
        this.ERPatient.AgeUnit = "Y";
        this.GetCountrySubDivision();
      }
    }
  }

  public InitializeData() {
    this.ERPatient = new EmergencyPatientModel();
  }

  public InitializeDataSelected() {
    this.ERPatient = this.currentERPatient;
    this.changeDetector.detectChanges();
    if (this.ERPatient.DateOfBirth == null) {
      if (!this.ERPatient.Age) {
        this.ERPatient.DateOfBirth = moment().format('YYYY-MM-DD');
        this.ERPatient.Age = "0";
        this.ERPatient.AgeUnit = "Y";
      } else { this.CalculateDob(); }
    }
    else if (isNaN(Date.parse(this.ERPatient.DateOfBirth))) {
      if (!this.ERPatient.Age) {
        this.ERPatient.DateOfBirth = moment().format('YYYY-MM-DD');
        this.ERPatient.Age = "0";
        this.ERPatient.AgeUnit = "Y";
      } else { this.CalculateDob(); }
    }
    else {
      this.ERPatient.DateOfBirth = moment(this.currentERPatient.DateOfBirth).format('YYYY-MM-DD');
    }

    this.isPoliceCaseState = this.ERPatient.IsPoliceCase;
    if (this.ERPatient.ModeOfArrival) {
      let currMoa = new ModeOfArrivalModel();
      currMoa.ModeOfArrivalId = this.ERPatient.ModeOfArrival;
      currMoa.ModeOfArrivalName = this.ERPatient.ModeOfArrivalName;
      this.SelectedModeOfArrival = currMoa;
    }

    //this.generateAge();
    this.CalculateDob();
    this.generateAge();
    this.changeDetector.detectChanges();
    this.GetCountrySubDivision();
  }

  public GetERPatNumAndModeOfArrival() {
    this.emergencyBLService.GetERNumAndModeOfArrData()
      .subscribe(res => {
        if (res.Status == "OK") {
          //assign the unique patientNumber
          this.ERPatientNumber = res.Results.LatestERPatientNumber;
          this.ModeOfArrivalList = res.Results.AllModeOfArrival;
        }
      });
  }


  public RegisterNewERPatient() {
    this.loading = true;

    if (this.loading) {
      //check if middlename exists or not to append to Shortname 
      var midName = this.ERPatient.MiddleName;
      if (midName) {
        midName = this.ERPatient.MiddleName.trim() + " ";
      } else {
        midName = " ";
      }

      this.ERPatient.FirstName = this.ERPatient.FirstName.trim();
      this.ERPatient.LastName = this.ERPatient.LastName.trim();
      this.ERPatient.MiddleName = this.ERPatient.MiddleName ? this.ERPatient.MiddleName.trim() : this.ERPatient.MiddleName;
      this.ERPatient.ShortName = this.ERPatient.FirstName + midName + this.ERPatient.LastName;

      this.ERPatient.DefaultDepartmentName = this.erServiceDepartmentName;
      if ((this.ERPatient.Age || this.ERPatient.Age == "0") && !this.ERPatient.DateOfBirth) {
        this.CalculateDob;
        var age = this.ERPatient.Age;
        this.ERPatient.Age = age + this.ERPatient.AgeUnit;
      } else {
        var age = this.ERPatient.Age;
        this.ERPatient.Age = age + this.ERPatient.AgeUnit;
      }

      if (this.addNewUnknownERPatient && !this.selectionFromExistingPatient) {
        this.ERPatient.FirstName = "Unknown-" + this.ERPatientNumber;
        this.ERPatient.LastName = "Unknown-" + this.ERPatientNumber;
        this.ERPatient.ERPatientValidator.controls["FirstName"].setValue(this.ERPatient.FirstName);
      }

      if (this.selectionFromExistingPatient && this.ERPatient.PatientId && !this.ERPatient.PatientVisitId) {
        this.ERPatient.ERPatientValidator.controls["FirstName"].enable();
        this.ERPatient.ERPatientValidator.controls["Gender"].enable();
      }

      //for checking validations, marking all the fields as dirty and checking the validity.
      for (var i in this.ERPatient.ERPatientValidator.controls) {
        this.ERPatient.ERPatientValidator.controls[i].markAsDirty();
        this.ERPatient.ERPatientValidator.controls[i].updateValueAndValidity();
      }
      if (this.ERPatient.IsValid(undefined, undefined)) {
        this.emergencyBLService.PostERPatient(this.ERPatient, this.selectionFromExistingPatient)
          .subscribe((res: DanpheHTTPResponse) => {
            if (res.Status == "OK") {
              this.sendERPatientData.emit({ submit: true, ERPatient: res.Results });
              this.selectionFromExistingPatient = false;
              this.msgBoxServ.showMessage("success", ['New Emergency Patient Added']);
              this.loading = false;
            }
            else {
              this.msgBoxServ.showMessage("failed", ['Sorry, Patient Cannot be Added']);
              this.loading = false;
            }
          });

      }
      else {
        this.loading = false;
      }
    }
  }


  public UpdateERPatient() {
    this.loading = true;
    if (this.loading) {

      if ((this.ERPatient.Age || this.ERPatient.Age == "0") && !this.ERPatient.DateOfBirth) {
        this.CalculateDob;
        var age = this.ERPatient.Age;
        this.ERPatient.Age = age + this.ERPatient.AgeUnit;
      } else {
        var age = this.ERPatient.Age;
        this.ERPatient.Age = age + this.ERPatient.AgeUnit;
      }

      //for checking validations, marking all the fields as dirty and checking the validity.
      for (var i in this.ERPatient.ERPatientValidator.controls) {
        this.ERPatient.ERPatientValidator.controls[i].markAsDirty();
        this.ERPatient.ERPatientValidator.controls[i].updateValueAndValidity();
      }
      if (this.ERPatient.IsValid(undefined, undefined)) {
        this.emergencyBLService.UpdateERPatient(this.ERPatient)
          .subscribe((res: DanpheHTTPResponse) => {
            if (res.Status == "OK") {
              this.sendERPatientData.emit({ submit: true, ERPatient: res.Results });
              this.loading = false;
              this.msgBoxServ.showMessage("success", ['Emergency Patient Updated']);
            }
            else {
              this.msgBoxServ.showMessage("failed", ['Sorry, Patient Cannot be Updated']);
              this.loading = false;
            }
          });
      }
      else {
        this.loading = false;
      }
    }
  }



  public GetMatchingPatientList() {
    //for checking validations, marking all the fields as dirty and checking the validity.
    for (var i in this.ERPatient.ERPatientValidator.controls) {
      this.ERPatient.ERPatientValidator.controls[i].markAsDirty();
      this.ERPatient.ERPatientValidator.controls[i].updateValueAndValidity();
    }
    if (this.ERPatient.IsValid(undefined, undefined)) {
      this.matchingPatientList = [];
      this.loading = true;

      if (!this.addNewUnknownERPatient && !this.selectionFromExistingPatient) {
        this.emergencyBLService.GetMatchingPatientInER(this.ERPatient.FirstName.trim(), this.ERPatient.LastName.trim(),
          this.ERPatient.DateOfBirth.trim(), this.ERPatient.ContactNo.trim())
          .subscribe((res: DanpheHTTPResponse) => {
            if (res.Status == "OK" && res.Results.length > 0) {
              if (this.ERPatient.PatientId && this.update) {
                this.matchingPatientList = res.Results.filter(r => (r.PatientId != this.ERPatient.PatientId));
                if (this.matchingPatientList && this.matchingPatientList.length) {
                  this.showMatchingPatientList = true;
                } else {
                  this.UpdateERPatient();
                }
              } else {
                this.matchingPatientList = res.Results;
                this.showMatchingPatientList = true;
              }
            }
            else {
              if (this.update) {
                this.UpdateERPatient();
              } else {
                this.RegisterNewERPatient();
              }
            }
          });
      } else {
        if (this.update) {
          this.UpdateERPatient();
        } else {
          this.RegisterNewERPatient();
        }
      }
    } else {
      this.loading = false;
    }
  }

  //captalize first letter (controlName for field is use to update)
  public capitalizeFirstLetter(inputstr) {
    let returnStr: string = CommonFunctions.CapitalizeFirstLetter(inputstr);
    return returnStr;
  }

  public AddUnknownERPatient() {
    this.ERPatient = new EmergencyPatientModel();
    this.changeDetector.detectChanges();
    this.defaultLoad = true;

    if (!this.addNewUnknownERPatient) {
      this.addNewUnknownERPatient = true;
      this.ERPatient.FirstName = "Unknown-" + this.ERPatientNumber;
      this.ERPatient.LastName = "Unknown-" + this.ERPatientNumber;
      this.ERPatient.Age = "0";
      this.ERPatient.AgeUnit = "Y";
      this.ERPatient.DateOfBirth = moment().format('YYYY-MM-DD');
      this.ERPatient.CountryId = this.GetCountryParameter();
      this.GetCountrySubDivision();
      this.ERPatient.EnableControl("FirstName", false);
      this.ERPatient.EnableControl("LastName", false);
      //this.ERPatient.ERPatientValidator.controls["FirstName"].setValue(this.ERPatient.FirstName);              
      //this.ERPatient.EnableControl("Gender", false);  
    }
    else {
      this.addNewUnknownERPatient = false;
      this.ERPatient.CountryId = this.GetCountryParameter();
      this.ERPatient.Age = "0";
      this.ERPatient.AgeUnit = "Y";
      this.ERPatient.DateOfBirth = moment().format('YYYY-MM-DD');
      this.GetCountrySubDivision();
      this.ERPatient.EnableControl("FirstName", true);
      this.ERPatient.EnableControl("LastName", true);
      //this.ERPatient.EnableControl("FirstName", true);   
      //this.ERPatient.EnableControl("Gender", true);  
    }


  }

  //loads CalendarTypes from Paramter Table (database) and assign the require CalendarTypes to local variable.
  public LoadCalendarTypes() {
    let Parameter = this.coreService.Parameters;
    Parameter = Parameter.filter(parms => parms.ParameterName == "CalendarTypes");
    let calendarTypeObject = JSON.parse(Parameter[0].ParameterValue);
    this.calType = calendarTypeObject.PatientRegistration;
  }

  //Gets the list of all the countries
  public LoadCountryList() {
    this.emergencyBLService.GetAllCountries()
      .subscribe(res => {
        if (res.Status == "OK") {
          this.Countries = res.Results;
          this.ERPatient.CountryId = this.GetCountryParameter();
        }
      });
  }

  //Get the default country parameter from Parameter Table
  public GetCountryParameter(): number {
    let countryId: number = 0;
    try {
      if(this.ERPatient.CountryId){
        countryId = this.ERPatient.CountryId;
      }else{
        let countryJson = this.coreService.Parameters.filter(a => a.ParameterName == 'DefaultCountry')[0]["ParameterValue"];
       countryId = JSON.parse(countryJson).CountryId;
      }
    } catch (ex) {
      countryId = 0;
    }
    return countryId;
  }

  // this is used to get data from master table according to the countryId
  public GetCountrySubDivision() {
    var countryId = this.ERPatient.CountryId;
    this.emergencyBLService.GetCountrySubDivision(countryId)
      .subscribe(res => {
        if (res.Status == 'OK' && res.Results.length) {
          this.CountrySubDivisionList = [];
          res.Results.forEach(a => {
            this.CountrySubDivisionList.push({
              "Key": a.CountrySubDivisionId, "Value": a.CountrySubDivisionName
            });
          });

          if (this.defaultLoad) {
            if (!this.ERPatient.PatientId) { //checking whether it is for new registration or not
              this.LoadCountryDefaultSubDivision(); //to get the default district/state
            }
            else {
              let district = this.CountrySubDivisionList.find(a => a.Key == this.ERPatient.CountrySubDivisionId);
              this.selDistrict = district ? district.Value : "";
            }
          }
          else {
            this.selDistrict = this.CountrySubDivisionList[0].Value;
          }
          this.DistrictChanged();
        }
        else {
          this.msgBoxServ.showMessage("error", [res.ErrorMessage]);
          //alert(res.ErrorMessage);
        }
      },
        err => {
          this.msgBoxServ.showMessage("error", ["failed get State/ District.please check log for details."]);
          //alert('failed get State/District. please check log for details.');

          console.log(err.ErrorMessage);
        });
  }

  //getting country name from core_CFG_parameter table
  public LoadCountryDefaultSubDivision() {
    let subDivision = this.coreService.GetDefaultCountrySubDivision();
    if (subDivision) {
      this.ERPatient.CountrySubDivisionId = subDivision.CountrySubDivisionId;
      this.selDistrict = subDivision.CountrySubDivisionName;
    }
  }

  public DistrictChanged() {
    let district = null;
    // check if user has given proper input string for item name
    //or has selected object properly from the dropdown list.
    if (this.selDistrict && this.CountrySubDivisionList) {
      if (typeof (this.selDistrict) == 'string' && this.CountrySubDivisionList.length) {
        district = this.CountrySubDivisionList.find(a => a.Value.toLowerCase() == this.selDistrict);
      }
      else if (typeof (this.selDistrict) == 'object') {
        district = this.selDistrict;
      }        
      if (district) {
        this.ERPatient.CountrySubDivisionId = district.Key;
      }
    }
  }

  public ModeOfArrivalChanged() {
    let moa = null;
    // check if user has given proper input string for item name
    //or has selected object properly from the dropdown list.
    if (this.SelectedModeOfArrival) {
      console.log(typeof (this.SelectedModeOfArrival));
      if (typeof (this.SelectedModeOfArrival) == 'string' && this.SelectedModeOfArrival.trim() != '') {
        this.ERPatient.ModeOfArrival = null;
        this.ERPatient.ModeOfArrivalName = this.SelectedModeOfArrival;
      }
      else if (typeof (this.SelectedModeOfArrival) == 'object') {
        moa = this.SelectedModeOfArrival;
        if (moa) {
          this.ERPatient.ModeOfArrival = moa.ModeOfArrivalId;
          this.ERPatient.ModeOfArrivalName = moa.ModeOfArrivalName;
        }
      }
    } else {
      this.ERPatient.ModeOfArrival = null;
      this.ERPatient.ModeOfArrivalName = null;
    }
  }

  //used to format display of item in ng-autocomplete.
  myListFormatter(data: any): string {
    let html = data["Value"];
    return html;
  }

  ModeOfArrivalListFormatter(data: any): string {
    let html = data["ModeOfArrivalName"];
    return html;
  }

  public CalculateDob(indicator?: number) {
    if (indicator) {
      if (indicator == 1) {
        this.ERPatient.AgeUnit = "D";
      }
      else if (indicator == 2) {
        this.ERPatient.AgeUnit = "M";
      }
      else if (indicator == 3) {
        this.ERPatient.AgeUnit = "Y";
      }
    }
    //if (this.model.Age && this.model.AgeUnit) {
    if ((this.ERPatient.Age || this.ERPatient.Age == "0") && this.ERPatient.AgeUnit) {
      var age: number = Number(this.ERPatient.Age);
      var ageUnit: string = this.ERPatient.AgeUnit;
      this.ERPatient.DateOfBirth = this.patientService.CalculateDOB(age, ageUnit);
    }
  }

  public generateAge() {
    let dobYear: number = Number(moment(this.ERPatient.DateOfBirth).format("YYYY"));
    if (dobYear > 1900) {
      //this.model.Age = String(Number(moment().format("YYYY")) - Number(moment(this.model.DateOfBirth).format("YYYY")));
      var yrs = parseInt(String(moment().diff(moment(this.ERPatient.DateOfBirth), 'years')));
      var mnths = parseInt(String(moment().diff(moment(this.ERPatient.DateOfBirth), 'months')));
      var dys = parseInt(String(moment().diff(moment(this.ERPatient.DateOfBirth), 'days')));

      let validYears: boolean = yrs > 0 ? true : false;
      let validMonths: boolean = mnths > 0 ? true : false;
      let validDays: boolean = dys > 0 ? true : false;

      if (validYears) {
        this.ERPatient.AgeUnit = "Y";
        this.ERPatient.Age = String(yrs);
      } else if (validMonths && !validYears) {
        this.ERPatient.AgeUnit = "M";
        this.ERPatient.Age = String(mnths);
      } else if (validDays && !validMonths && !validYears) {
        this.ERPatient.AgeUnit = "D";
        this.ERPatient.Age = String(dys);
      } else {
        this.ERPatient.Age = "0";
        this.ERPatient.AgeUnit = "Y";
      }      

    }
  }

  public SplitAgeAndUnit() {
    if (this.ERPatient.Age) {
      var splitData = [];
      if (this.ERPatient.Age.includes("Y")) {
        splitData = this.ERPatient.Age.split("Y");
        this.ERPatient.Age = splitData[0];
        this.ERPatient.AgeUnit = "Y";
      }
      else if (this.ERPatient.Age.includes("M")) {
        splitData = this.ERPatient.Age.split("M");
        this.ERPatient.Age = splitData[0];
        this.ERPatient.AgeUnit = "M";
      }
      else if (this.ERPatient.Age.includes("D")) {
        splitData = this.ERPatient.Age.split("D");
        this.ERPatient.Age = splitData[0];
        this.ERPatient.AgeUnit = "D";
      }

    }
  }

  public SplitAgeAndUnitFromInputPatient(ERPatientToEdit: EmergencyPatientModel) {
    if (ERPatientToEdit.Age) {
      var splitData = [];
      if (ERPatientToEdit.Age.includes("Y")) {
        splitData = ERPatientToEdit.Age.split("Y");
        ERPatientToEdit.Age = splitData[0];
        ERPatientToEdit.AgeUnit = "Y";
      }
      else if (ERPatientToEdit.Age.includes("M")) {
        splitData = ERPatientToEdit.Age.split("M");
        ERPatientToEdit.Age = splitData[0];
        ERPatientToEdit.AgeUnit = "M";
      }
      else if (ERPatientToEdit.Age.includes("D")) {
        splitData = ERPatientToEdit.Age.split("D");
        ERPatientToEdit.Age = splitData[0];
        ERPatientToEdit.AgeUnit = "D";
      }
      else {
        ERPatientToEdit.AgeUnit = "Y";
      }

    }
  }

  public Close() {
    this.sendERPatientData.emit({ submit: false });
  }

  public emitMatchingListCloseAction($event) {
    let action = $event.action;
    let data = $event.data;
    if (action == "add-new") {
      this.showMatchingPatientList = false;
      if (this.update) {
        this.UpdateERPatient();
      } else {
        this.RegisterNewERPatient();
      }
    }
    else if (action == "close") {
      this.showMatchingPatientList = false;
      this.loading = false;
    }
    else if (action == "use-existing") {
      let patId = data;
      this.emergencyBLService.GetPatientById(patId).subscribe(res => {
        if (res.Status == "OK") {

          this.ERPatient.FirstName = res.Results.FirstName;
          this.ERPatient.LastName = res.Results.LastName;
          this.ERPatient.MiddleName = res.Results.MiddleName;
          this.ERPatient.Gender = res.Results.Gender;
          this.ERPatient.FullName = res.Results.ShortName;
          this.ERPatient.Address = res.Results.Address;
          this.ERPatient.Age = res.Results.Age;
          this.ERPatient.ContactNo = res.Results.PhoneNumber;
          this.ERPatient.CountryId = res.Results.CountryId;
          this.ERPatient.CountrySubDivisionId = res.Results.CountrySubDivisionId;
          this.ERPatient.DateOfBirth = res.Results.DateOfBirth;
          this.ERPatient.PatientId = res.Results.PatientId;
          this.ERPatient.IsExistingPatient = true;
          this.SplitAgeAndUnit();
          this.generateAge();

          this.update = false;
          this.ERPatient.EnableControl("FirstName", false);
          this.ERPatient.EnableControl("LastName", false);
          this.ERPatient.EnableControl("Gender", false);

          this.selectionFromExistingPatient = true;
          this.showMatchingPatientList = false;
          this.RegisterNewERPatient();
        }
      });
    }
  }

}
