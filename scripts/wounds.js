let abilityDict = {
  "str": { Name: "Force"},
  "dex": { Name: "Dextérité" },
  "con": { Name: "Constitution"},
  "int": { Name: "Intelligence"},
  "wis": { Name: "Sagesse"},
  "cha": { Name: "Charisme"}
}

let isWoundedRoll = false;
let rollType = "Skill";
let winHeight = '220px';

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

Hooks.once("init", function() {
  CONFIG.debug.hooks = true;
});

Hooks.on('renderActorSheet', (actorSheet, html, data) => {
  actor = actorSheet.actor
  console.log(html);
  
  if(actor.type=='character'){
    const abilityItem = html.find(`[class="ability-score "]`);

    abilityItem.append(
      "<a class='wound-button' data-action='wound'><i class='fas fa-heartbeat'></i></a>"
    );

    html.on('click', '.wound-button', (event) => {      
      let ability =  event.target.closest("div.ability-score").dataset.ability;
      let flagIsWounded = 'flags.wounds5e.' + ability + '.isWounded';
      let flagDaysToHeal = 'flags.wounds5e.' + ability + '.daysToHeal';
      
      new WoundConfig(actor, ability, foundry.utils.getProperty(actor, flagIsWounded), foundry.utils.getProperty(actor, flagDaysToHeal)).render(true)
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
      let newDaysToHeal = foundry.utils.getProperty(actor, 'flags.wounds5e.' + key + '.daysToHeal')-1;
      let isWounded = foundry.utils.getProperty(actor, 'flags.wounds5e.' + key + '.isWounded');

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

Hooks.on('dnd5e.preRollAbilityTest', (actor, data, ability) => {
  isWoundedRoll = foundry.utils.getProperty(actor, 'flags.wounds5e.' + ability + '.isWounded');
  rollType = "abilityTest";
})

Hooks.on('dnd5e.preRollAbilitySave', (actor, data, ability) => {
  isWoundedRoll = foundry.utils.getProperty(actor, 'flags.wounds5e.' + ability + '.isWounded');
  rollType = "abilitySave";
})

Hooks.on('dnd5e.preRollSkill', (actor, data) => {
  isWoundedRoll = foundry.utils.getProperty(actor, 'flags.wounds5e.' + data.data.defaultAbility + '.isWounded');
  rollType = "Skill";
})

Hooks.on('renderDialog', (Dialog, html) => {
  if(isWoundedRoll){
    const dialogContent = html.find(`[class="dialog-content"]`);
    let disButton = document.getElementsByClassName("disadvantage")[0];
    let normButton = document.getElementsByClassName("normal")[0];

    switch (rollType){
      case "abilityTest":
        winHeight = '220px';
        break;
      case "abilitySave":
        winHeight = '220px';
        break;
      case "Skill":
        winHeight = '250px';
        break;   
      default:
        console.log("Error selecting window");     
    }

    let dialogWindow = document.getElementsByClassName("app window-app dialog")[0];

  
    dialogContent.append(
      "<div class=wounded-warning><p>Attention, cette capacité et blessée, il faut lancer avec désavantage !</p></div>"
    );

    dialogWindow.style.height = winHeight;

    normButton.classList.remove("default");
    normButton.classList.remove("bright");

    disButton.classList.add("default");
    disButton.classList.add("bright");
    disButton.focus();
  }
  isWoundedRoll=false;
})


