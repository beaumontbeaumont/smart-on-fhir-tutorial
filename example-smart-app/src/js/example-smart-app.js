(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                              'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                              'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
                      }
                    }
                  });

        var allergies = smart.patient.api.fetchAll({
          type: 'AllergyIntolerance',
        });

        var medications = smart.patient.api.fetchAll({
          type: 'MedicationStatement',
        });

        var conditions = smart.patient.api.fetchAll({
          type: 'Condition',
          query: {
            category: 'problem',
          }
        });

        var immunizations = smart.patient.api.fetchAll({
          type: 'Immunization',
        });

        $.when(pt, obv, allergies, medications, conditions, immunizations).fail(onError);

        $.when(pt, obv, allergies, medications, conditions, immunizations).done(function(patient, obv, allergies, medications, conditions, immunizations) {
          var byCodes = smart.byCodes(obv, 'code');
          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family.join(' ');
          }

          var allergiesrow = ''
          allergies.forEach(function(allergy){
              allergiesrow += '<li><div class="row"><div class="span7"><h2 class="x-small-heading text-bold margin-none-md">' + allergy.substance.text + '</h2></div>'
              if (typeof allergy.reaction !== 'undefined') {
                allergy.reaction.forEach(function(reaction){
                  allergiesrow += '<div class="span5 span-last"><dl class="dl-flow margin-none"><dt>Reactions:</dt>'
                  reaction.manifestation.forEach(function(manifestation){
                    allergiesrow += '<dd>' + manifestation.text + '</dd>'
                  });
                  allergiesrow += '</dl></div>'
                });
              }
              allergiesrow += '</div></li>'
            }
          );
          $('#allergies').html(allergiesrow);

          var problemsrow = ''

          conditions.forEach(function(problem){
            problemsrow += '<li><div class="row"><div class="span7"><dl class="dl-paired margin-none-md"><dt class="x-small-heading text-bold">' + problem.code.text + '</dt>'
            if (typeof problem.code !== 'undefined' && typeof problem.code.coding !== 'undefined') {
              if(problem.code.coding[0].system == 'http://hl7.org/fhir/sid/icd-10-cm'){
                p_code_set='2.16.840.1.113883.6.90'
              }
              if(problem.code.coding[0].system == 'http://snomed.info/sct'){
                p_code_set='2.16.840.1.113883.6.96'

              }
              if(typeof p_code_set !== undefined){
                info_url = 'https://apps.nlm.nih.gov/medlineplus/services/mpconnect.cfm?mainSearchCriteria.v.cs=' + p_code_set + '&mainSearchCriteria.v.c=' + problem.code.coding[0].code + '&mainSearchCriteria.v.dn=&informationRecipient.languageCode.c=en'
                problemsrow += '<dd><a href="' + info_url + '" target="">Learn more about this<span class="icon-client-share"></span></a></dd>'
              }
            }
            problemsrow += '</dl></div><div class="span5">'
            if (typeof problem.dateRecorded !== 'undefined') {
              problemsrow += '<dl class="dl-paired margin-none"><dt>Date Recorded:</dt><dd>' + problem.dateRecorded + '</dd></dl>'
            }
            problemsrow += '</div></div></li>'
          })
          $('#problems').html(problemsrow);

          var medicationsrow = ''

          medications.forEach(function(medication){
            if(medication.status == 'entered-in-error'){
              return;
            }

            medicationsrow += '<li><div><dl class="dl-paired"><dt class="x-small-heading text-bold">' + medication.medicationCodeableConcept.text + '</dt></dl></div>'
            if(typeof medication.informationSource !== undefined || typeof medication.effectivePeriod !== undefined){
              medicationsrow += '<div class="row"><div class="span5"><dl class="dl-paired margin-none">'
              if(typeof medication.informationSource !== 'undefined' && typeof medication.informationSource.display !== 'undefined'){
                medicationsrow += '<dt>Ordered By</dt><dd>' + medication.informationSource.display + '</dd>'
              }
              medicationsrow += '</dl></div><div class="span7"><dl class="dl-paired margin-none">'
              if(typeof medication.effectivePeriod !== 'undefined' && typeof medication.effectivePeriod.start !== 'undefined'){
                medicationsrow += '<dt>Date Started On</dt><dd>' + medication.effectivePeriod.start + '</dd>'
              }
              medicationsrow += '</dl></div></div><div class="section-small"></div>'
              if(typeof medication.dosage[0] !== 'undefined' && typeof medication.dosage[0]._text !== 'undefined'){
                m_dose = medication.dosage[0]._text.extension[0].valueString
              }
              medicationsrow += '<div class="row"><div class="span12"><dl class="dl-paired margin-none"><dt>Dose:</dt><dd>' + m_dose + '</dd></dl></div></div>'

              if (typeof medication.medicationCodeableConcept !== 'undefined' && typeof medication.medicationCodeableConcept.coding[0] !== 'undefined') {
                if(medication.medicationCodeableConcept.coding[0].system == 'http://www.nlm.nih.gov/research/umls/rxnorm'){
                  m_code_set='2.16.840.1.113883.6.88'
                }
                if(typeof m_code_set !== undefined){
                  info_url = 'https://apps.nlm.nih.gov/medlineplus/services/mpconnect.cfm?mainSearchCriteria.v.cs=' + m_code_set + '&mainSearchCriteria.v.c=' + medication.medicationCodeableConcept.coding[0].code + '&mainSearchCriteria.v.dn=&informationRecipient.languageCode.c=en'
                  medicationsrow += '<div class="row"><div class="span12"><dl class="dl-paired margin-none"><a href="' + info_url + '" target="">Learn more about this<span class="icon-client-share"></span></a></dl></div></div></li>'
                }
              }
            }
          })
          $('#medications').html(medicationsrow);


          var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');

          var p = defaultPatient();
          p.fname = fname;
          p.lname = lname;

          if (typeof systolicbp != 'undefined')  {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname + ' ' + p.lname);
    $('#nameswitcher').html(p.fname + ' ' + p.lname);
  };

})(window);
