let abilityDict = {
  "str": { Name: "Force"},
  "dex": { Name: "Dextérité" },
  "con": { Name: "Constitution"},
  "int": { Name: "Intelligence"},
  "wis": { Name: "Sagesse"},
  "cha": { Name: "Charisme"}
}

class WoundConfig extends FormApplication {
  constructor(actor, ability, isWounded, daysToHeal) {
    super();
    this.actor = actor;
    this.ability = ability;
    this.isWounded = isWounded;
    this.daysToHeal = daysToHeal;
  }

  static get defaultOptions() {
    const defaults = super.defaultOptions;
  
    const overrides = {
      height: 'auto',
      id: 'wound-conf',
      template: "modules/Wounds-system-for-5e/templates/wounds.hbs",
      title: 'Configuration des blessures',
      closeOnSubmit: false,
      submitOnChange: true
    };
  
    const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
    
    return mergedOptions;
  }

  getData() {
    // Send data to the template
    return {
      ability: abilityDict[this.ability].Name,
      isWounded: this.isWounded,
      daysToHeal: this.daysToHeal,
    };
  }

  async _updateObject(event, formData) {
    const expandedData = foundry.utils.expandObject(formData);
    
    if(event["type"]=='submit'){
      this.actor.update({
        [`flags.wounds5e.${this.ability}.isWounded`]: expandedData['daysToHeal'] == 0 ? false : expandedData['isWounded'],
        [`flags.wounds5e.${this.ability}.daysToHeal`]: expandedData['daysToHeal']
      })
      
      this.actor.update({
        [`flags.midi-qol.disadvantage.ability.check.${this.ability}`]: expandedData['isWounded'] ? 1 : 0
      })
      
      this.close();
    }
  
  }
}

Hooks.on('renderActorSheet', (actorSheet, html, data) => {
  actor = actorSheet.actor
  
  if(actor.type=='character'){
    const abilityItem = html.find(`[class="ability-score "]`);

    abilityItem.append(
      "<a class='wound-button' data-action='wound'><i class='fas fa-heartbeat'></i></a>"
    );

    html.on('click', '.wound-button', (event) => {      
      let ability =  event.target.closest("div.ability-score").dataset.ability;
      let flagIsWounded = 'flags.wounds5e.' + ability + '.isWounded';
      let flagDaysToHeal = 'flags.wounds5e.' + ability + '.daysToHeal';
      
      new WoundConfig(actor, ability, getProperty(actor, flagIsWounded), getProperty(actor, flagDaysToHeal)).render(true)
    });
  }
});


Hooks.on('preCreateActor', (actor, data, options, userId) => {
  if (actor.type === 'character') {
    Object.keys(abilityDict).forEach(function(key) {
      actor.updateSource({'flags.wounds5e': {
        [`${key}.isWounded`] : false,
        [`${key}.daysToHeal`] : 0}
      })
    });
  }
})

Hooks.on('dnd5e.preRestCompleted', (actor, data) => {
  if(data["newDay"]==true){
    Object.keys(abilityDict).forEach(function(key) {
      let newDaysToHeal = getProperty(actor, 'flags.wounds5e.' + key + '.daysToHeal')-1;
      let isWounded = getProperty(actor, 'flags.wounds5e.' + key + '.isWounded');

      if(newDaysToHeal==0){
        isWounded=false;

        this.actor.update({
          [`flags.wounds5e.${key}.daysToHeal`]: newDaysToHeal,
          [`flags.wounds5e.${key}.isWounded`]: isWounded,
          [`flags.midi-qol.disadvantage.ability.check.${key}`]: 0
        })
      } else if(newDaysToHeal>0) {
        this.actor.update({
          [`flags.wounds5e.${key}.daysToHeal`]: newDaysToHeal
        })
      }
    });
  }
})

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(ToDoList.ID);
});
