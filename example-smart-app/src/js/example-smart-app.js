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