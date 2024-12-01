import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";


const COMMANDS_KEY = "customCommands";
const customCommands = [];
const userCustomCommands = {};


function saveCustomCommands() {
  world.setDynamicProperty(COMMANDS_KEY, JSON.stringify(customCommands));
}


function loadCustomCommands() {
  const savedCommands = world.getDynamicProperty(COMMANDS_KEY);
  if (savedCommands) {
    customCommands.splice(0, customCommands.length, ...JSON.parse(savedCommands));
  }
}


function getUserCommands(player) {
  if (!userCustomCommands[player.name]) {
    userCustomCommands[player.name] = customCommands.filter(cmd => cmd.isPublic || cmd.creator === player.name);
  }
  return userCustomCommands[player.name];
}


loadCustomCommands();


world.afterEvents.itemUse.subscribe(data => {
  const player = data.source;
  const item = data.itemStack;

  if (item.typeId === "item:custom_commands_book" && player.hasTag("Admin")) {
    showHomeForm(player);
  }
});


function showHomeForm(player) {
  const Home_Form = new ActionFormData();
  Home_Form.title("管理メニュー");
  Home_Form.body("設定したいボタンを選択してください。\n§e※管理者専用タグ (Admin) が付与されている場合のみこのメニューが表示されます。");
  Home_Form.button("ユーザーゲームモードを設定");
  Home_Form.button("ユーザーエフェクトを設定");
  Home_Form.button("カスタムコマンド一覧");

  Home_Form.show(player).then(({ selection, canceled }) => {
    if (canceled) return;

    switch (selection) {
      case 0:
        showGameModeForm(player);
        break;
      case 1:
        showEffectForm(player);
        break;
      case 2:
        showCustomCommandForm(player, 0);
        break;
    }
  });
}


function showGameModeForm(player) {
  const Form1 = new ActionFormData();
  Form1.title("ユーザーゲームモード変更メニュー");
  Form1.body("変更したいゲームモードを選択してください。\n※ボタンを押したユーザーのゲームモードを変更します。");
  Form1.button("サバイバルモード", "textures/items/iron_pickaxe");
  Form1.button("アドベンチャーモード", "textures/ui/adventure.png");
  Form1.button("クリエイティブモード", "textures/blocks/grass_side_carried");
  Form1.button("スペクテイターモード", "textures/ui/spectator.png");
  Form1.button("§2戻る", "textures/ui/back_home.png");

  Form1.show(player).then(({ selection, canceled }) => {
    if (canceled) return;

    switch (selection) {
      case 0:
        player.runCommand("gamemode survival @s");
        break;
      case 1:
        player.runCommand("gamemode adventure @s");
        break;
      case 2:
        player.runCommand("gamemode creative @s");
        break;
      case 3:
        player.runCommand("gamemode spectator @s");
        break;
      case 4:
        showHomeForm(player);
        break;
    }
  });
}


function showEffectForm(player) {
  const Form2 = new ActionFormData();
  Form2.title("ユーザーエフェクト設定メニュー");
  Form2.body("エフェクトを選択してください。\n※ボタンを押したユーザーにエフェクトが適用します。");
  Form2.button("§c全てのエフェクト削除", "textures/blocks/barrier");
  Form2.button("暗視エフェクト", "textures/ui/night_vision.png");
  Form2.button("透明エフェクト", "textures/ui/invisibility.png");
  Form2.button("§2戻る", "textures/ui/back_home.png");

  Form2.show(player).then(({ selection, canceled }) => {
    if (canceled) return;

    switch (selection) {
      case 0:
        player.runCommand("effect @s clear");
        break;
      case 1:
        player.runCommand("effect @s night_vision infinite 1 true");
        break;
      case 2:
        player.runCommand("effect @s invisibility infinite 1 true");
        break;
      case 3:
        showHomeForm(player);
        break;
    }
  });
}


function showCustomCommandForm(player, page) {
  const CustomForm = new ActionFormData();
  CustomForm.title("カスタムコマンドメニュー");
  CustomForm.body("独自に新しいカスタムコマンドを追加することができます。");

  const userCommands = customCommands.filter(cmd => cmd.isPublic || cmd.creator === player.name);
  const startIndex = page * 10;
  const endIndex = Math.min(startIndex + 10, userCommands.length);

  userCommands.slice(startIndex, endIndex).forEach(({ label }) => {
    CustomForm.button(label);
  });

  let navigationIndex = endIndex - startIndex;
  if (userCommands.length > endIndex) {
    CustomForm.button("§s次のページ", "textures/ui/next_page.png");
    navigationIndex++;
  }
  if (page > 0) {
    CustomForm.button("§s前のページ", "textures/ui/back_page.png");
    navigationIndex++;
  }

  const addCommandButtonIndex = navigationIndex;
  CustomForm.button("§g新規カスタムコマンドを追加");
  CustomForm.button("§2戻る", "textures/ui/back_home.png");

  CustomForm.show(player).then(({ selection, canceled }) => {
    if (canceled) return;

    if (selection < endIndex - startIndex) {
      showCommandOptionsForm(player, startIndex + selection, userCommands);

    } else if (selection === endIndex - startIndex && userCommands.length > endIndex) {
      showCustomCommandForm(player, page + 1);

    } else if (selection === endIndex - startIndex + 1 && page > 0) {
      showCustomCommandForm(player, page - 1);

    } else if (selection === addCommandButtonIndex) {
      showAddCommandForm(player);

    } else {
      showHomeForm(player);
    }
  });
}


function showAddCommandForm(player) {
  const addCommandForm = new ModalFormData();
  addCommandForm.title("新規カスタムコマンド追加");
  addCommandForm.textField("ボタンのラベルを入力してください。", "例: sayコマンド");
  addCommandForm.textField("追加したいコマンドを入力してください。\n§e※/は含まなくても問題ありません。§r", "例: say Hello");
  addCommandForm.toggle("このカスタムコマンドの公開設定 (デフォルト: §c非公開§r)", false);

  addCommandForm.show(player).then(({ formValues, canceled }) => {
    if (canceled || !formValues[0] || !formValues[1]) return;

    const label = formValues[0].trim();
    const command = formValues[1].trim();
    const isPublic = formValues[2];

    if (label && command) {
      const newCommand = { label, command, creator: player.name, isPublic };
      customCommands.push(newCommand);
      getUserCommands(player).push(newCommand);
      saveCustomCommands();
      player.runCommand("playsound random.orb @s ~ ~ ~ 1 1 1");
      player.sendMessage("§aカスタムコマンドが正常に保存されました。");
    }

    showCustomCommandForm(player, 0);
  });
}


function showCommandOptionsForm(player, commandIndex, userCommands) {
  const command = userCommands[commandIndex];
  const optionsForm = new ActionFormData();
  optionsForm.title(`${command.label}`);
  optionsForm.body(`コマンド作成者: ${command.creator}\nコマンド: ${command.command}\n公開状態: ${command.isPublic ? "§e公開§r" : "§c非公開§r"}`);
  optionsForm.button("§9コマンドを実行", "textures/blocks/command_block_side_mipmap");

  if (command.creator === player.name) {
    optionsForm.button("§s公開設定を変更", "textures/ui/share.png");
    optionsForm.button("§cコマンドを削除", "textures/ui/delete.png");
  }
  optionsForm.button("§2戻る", "textures/ui/back_page.png");

  optionsForm.show(player).then(({ selection, canceled }) => {
    if (canceled) return;

    if (selection === 0) {
      player.runCommand(command.command);

    } else if (selection === 1 && command.creator === player.name) {
      showChangeVisibilityForm(player, command, commandIndex, userCommands);

    } else if (selection === 2 && command.creator === player.name) {
      showDeleteConfirmationForm(player, commandIndex, userCommands);

    } else {
      showCustomCommandForm(player, 0);
    }
  });
}


function showChangeVisibilityForm(player, command, commandIndex, userCommands) {
  const visibilityForm = new ModalFormData();
  visibilityForm.title("カスタムコマンド公開状態の変更");
  visibilityForm.dropdown("カスタムコマンドの公開設定を選択してください。\n設定を§e公開§rにした場合、カスタムコマンド本を使用できる全てのユーザーにコマンドが表示されます。", ["§c非公開§r", "§e公開§r"], command.isPublic ? 1 : 0);

  visibilityForm.show(player).then(({ formValues, canceled }) => {
    if (canceled) return;

    const newIsPublic = formValues[0] === 1;
    command.isPublic = newIsPublic;
    saveCustomCommands();
    player.runCommand("playsound random.orb @s ~ ~ ~ 1 1 1");
    player.sendMessage(`§aカスタムコマンドの公開設定を${newIsPublic ? "§e公開§r" : "§c非公開§r"}§aに変更しました。`);

    showCommandOptionsForm(player, commandIndex, userCommands);
  });
}


function showDeleteConfirmationForm(player, commandIndex, userCommands) {
  const confirmationForm = new ActionFormData();
  confirmationForm.title("カスタムコマンドの削除確認");
  confirmationForm.body("このカスタムコマンドを削除しますか？");
  confirmationForm.button("§aはい");
  confirmationForm.button("§cいいえ");

  confirmationForm.show(player).then(({ selection, canceled }) => {
    if (canceled) return;

    if (selection === 0) {
      userCommands.splice(commandIndex, 1);
      customCommands.splice(customCommands.indexOf(userCommands[commandIndex]), 1);
      saveCustomCommands();
      player.runCommand("playsound random.orb @s ~ ~ ~ 1 1 1");
      player.sendMessage("§aカスタムコマンドが正常に削除されました。");
    }

    showCustomCommandForm(player, 0);
  });
}
