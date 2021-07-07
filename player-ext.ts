//%icon="\uf007" color="#6A6FEA"
namespace 玩家{}
namespace Player{
//================== 拓展玩家 ==================
    export class Player extends Character.Character{
        walk: number //走路状态.0000 ->下左上右
        curWeapon: Weapon.Weapon //当前持有武器
        oldWeapon: Weapon.Weapon //刚被丢弃的武器
        spareWeapon: Weapon.Weapon[] //备用武器
        maxWeapon: number //备用武器上限
        curFollow: number //当前持有武器的跟随器
        clearOldWeapon: number //清除被丢弃的武器
        deflWeapon: string //默认武器
    }
    const dirORmask = [8, 4, 2, 1]
    const dirANDmask = [7, 11, 13, 14]

    function reset(p: Player){
        Character.reset(p)
        p.walk = 0
        p.oldWeapon = null
        p.curWeapon = null
        p.spareWeapon = []
        p.maxWeapon = 1
        p.deflWeapon = ""
        p.curFollow = -1
        p.clearOldWeapon = -1
    }
    //------------- 按键控制 -------------
    let f = true

    // 暂停控制
    function stop (p: Player) {
        move(p, 0)
    }
    // 恢复控制
    function move (p: Player, speed: number) {
        controller.moveSprite(p, speed, speed)
        f = true
        walkAnimControl(p)
    }

    // dir: 0:下，1:左，2:上，3:右
    function dirButtonDown(p: Player, dir: Character.dirKind){
        if(dir != p.dir){
            f = true
        }
        if(p.walk == 0 || (p.dir&1) == (dir&1)){
            p.dir = dir
        }
        p.walk |= dirORmask[dir]
        if((p.attack | p.hurted) > 0){
            return
        }
        let w = p.curWeapon
        if(w != null){
            w.dir = p.dir
            w.setImage(w.images[w.dir])
            w.z = p.dir == 1 || p.dir == 2 ? p.z++ : p.z+1
        }
        animation.runImageAnimation(p, p.standimg[p.dir], 100, true)
        walkAnimControl(p)
    }

    function dirButtonUp(p: Player, dir: Character.dirKind){
        f = true
        p.walk &= dirANDmask[dir]
        if((p.walk & dirORmask[(dir+2)%4]) != 0){
            p.dir = (dir+2)%4
        }
        else if(p.walk != 0){
            let n = p.walk
            p.dir = 4
            while(n > 0){
                n = n>>1
                p.dir--
            }
        }
        let w = p.curWeapon
        if(w != null){
            w.dir = p.dir
            w.setImage(w.images[w.dir])
            w.z = p.dir == 1 || p.dir == 2 ? p.z++ : p.z+1
        }
        walkAnimControl(p)
    }

    function buttonA(p: Player){
        if((p.attack | p.hurted) > 0){
            return
        }
        animation.stopAnimation(animation.AnimationTypes.All, p)
        stop(p)
        animation.runImageAnimation(p, p.attackimg[p.dir], 100)
        let w = p.curWeapon
        if(w != null){
            w.attack = 1
            p.attack = 1
            animation.runImageAnimation(w, w.atkimages[p.dir], 50)
            setTimeout(()=>{
                w.setImage(w.images[w.dir])
                w.attack = 0
            }, w.atkimages[p.dir].length*100)
            if(w.skill != undefined && w.cdclock == -1){
                w.skill(new Helper.tempVarDic(), p)
                //武器损坏
                if(w.bulletNum != undefined && --w.bulletNum == 0){
                    weaponDestroy(p)
                }
                else{
                    w.cdclock = setTimeout(()=>{
                        w.cdclock = -1
                    }, w.cd)
                }
            }
        }
        setTimeout(()=>{
            p.attack = 0
            move(p, p.speed)
        }, p.attackimg[p.dir].length*100)
    }

    function weaponDestroy(p: Player){
        let w = p.curWeapon
        p.curWeapon = null
        w.destroy()
        clearInterval(p.curFollow)
        p.curFollow = -1
        if(p.spareWeapon.length > 0){
            popWeapon(p)
        }
    }

    //把武器加入备用武器
    function pushWeapon(p: Player, w: Sprite){
        w.setFlag(SpriteFlag.Invisible, true)
        w.setFlag(SpriteFlag.Ghost, true)
        w.setKind(SpriteKind.PlayerWeapon)
        p.spareWeapon.push(<Weapon.Weapon>w)
    }

    //拿一个备用武器当主武器
    function popWeapon(p: Player){
        if(p.curWeapon != null){
            stopPassiveSkill(p.curWeapon)
        }
        equiWeapon(p, p.spareWeapon.removeAt(0))
    }

    function stopPassiveSkill(w: Weapon.Weapon){
        for(let clock of w.pskillclock){
            if(clock.timeout != -1){
                clearTimeout(clock.timeout)
                clock.timeout = -1
                clearInterval(clock.interval)
                clock.interval = -1
            }
        }
    }
    function startPassiveSkill(p: Player){
        let w = p.curWeapon
        for(let s of w.passiveSkill){
            let clock = {timeout: -1, interval: -1}
            clock.interval = setInterval(()=>{
                s.skill(new Helper.tempVarDic(), p)
                if(w.bulletNum != undefined && --w.bulletNum <= 0){
                    clearInterval(clock.interval)
                    clock.interval = -1
                    weaponDestroy(p)
                }
            }, s.interval)
            w.pskillclock.push(clock)
            clock.timeout = setTimeout(()=>{
                clock.timeout = -1
                clearInterval(clock.interval)
                clock.interval = -1
            }, s.time)
        }
    }

    function buttonB(p: Player){
        if(p.spareWeapon.length > 0 && (p.attack | p.hurted) == 0){
            stopPassiveSkill(p.curWeapon)
            pushWeapon(p, p.curWeapon)
            clearInterval(p.curFollow)
            p.curFollow = -1
            popWeapon(p)
        }
    }

    function walkAnimControl(p: Player){
        if(p.walk == 0){
            animation.runImageAnimation(p, p.standimg[p.dir], 100, true)
            f = true
        }
        else if(f){
            animation.runImageAnimation(p, p.walkimgs[p.dir], 100, true)
            f = false
        }
    }

    function buttonControl(p: Player){
        controller.A.onEvent(ControllerButtonEvent.Pressed, function() {
            buttonA(p)
        })
        controller.B.onEvent(ControllerButtonEvent.Pressed, function() {
            buttonB(p)
        })
        controller.down.onEvent(ControllerButtonEvent.Pressed, function() {
            dirButtonDown(p, Character.dirKind.down)
        })
        controller.left.onEvent(ControllerButtonEvent.Pressed, function() {
            dirButtonDown(p, Character.dirKind.left)
        })
        controller.up.onEvent(ControllerButtonEvent.Pressed, function() {
            dirButtonDown(p, Character.dirKind.up)
        })
        controller.right.onEvent(ControllerButtonEvent.Pressed, function() {
            dirButtonDown(p, Character.dirKind.right)
        })
        controller.down.onEvent(ControllerButtonEvent.Released, function() {
            dirButtonUp(p, Character.dirKind.down)
        })
        controller.left.onEvent(ControllerButtonEvent.Released, function() {
            dirButtonUp(p, Character.dirKind.left)
        })
        controller.up.onEvent(ControllerButtonEvent.Released, function() {
            dirButtonUp(p, Character.dirKind.up)
        })
        controller.right.onEvent(ControllerButtonEvent.Released, function() {
            dirButtonUp(p, Character.dirKind.right)
        })
    }

    //------------- 玩家注册/定义 -------------
    let players = new Helper.mysprites("玩家")

    //%block
    //%group="自定义玩家"
    //%blockNamespace=玩家 
    //%blockId=setPlayer block="设置玩家 %img=screen_image_picker 命名为%name"
    //%weight=81
    //%inlineInputMode=inline
    //%draggableParameters="player"
    export function setPlayer(img: Image, name:string, cb:(player: Player)=>void){
        Helper.setSprite(players, img, name, cb)
    }

    export let curPlayer: Player

    //%block
    //%blockNamespace=玩家
    //%group="生成"
    //%blockId=createPlayer2 block="创建玩家%name ||在图块列表 列$x 行$y"
    //%x.defl=0 y.defl=0
    //%weight=99
    //%inlineInputMode=inline
    //%blockSetVariable=Player
    export function createPlayer2(name: string, x: number = 0, y: number = 0){
        let player = <Player>Helper.createSprite(players, name, x, y)
        if(player == null){
            return null
        }
        curPlayer = player
        reset(player)
        players.v[name].cb(player)
        player.setKind(SpriteKind.Player)
        scene.cameraFollowSprite(player)
        controller.moveSprite(player, player.speed, player.speed)
        getWeapon()
        buttonControl(player)
        if(player.deflWeapon != ""){
            equiWeapon(player, Weapon.makeWeapon(player.deflWeapon, player.x, player.y))
        }
        return player
    }

    //%block
    //%blockNamespace=玩家
    //%group="生成"
    //%blockId=createPlayer block="创建玩家%name ||在图块列表 列$x 行$y"
    //%x.defl=0 y.defl=0
    //%weight=99
    //%inlineInputMode=inline
    export function createPlayer(name: string, x: number = 0, y: number = 0){
        createPlayer2(name, x, y)
    }

    export enum aKind{
        //% block="血量"
        hp,
        //% block="速度"
        speed,
        //% block="装备上限"
        wmax,
    }

    //%block
    //%group="图像"
    //%blockNamespace=玩家
    //%blockId=setCharacterAnim block="设置人物%b=variables_get(character) %d=dirKind 方向 %k=animKind 动画 为 %v=animation_editor"
    //%weight=78
    //%inlineInputMode=inline
    export function setCharacterAnim(b:Character.Character, d: Character.dirKind, k: Character.animKind, v: Image[]){
        if(k == Character.animKind.walk){
            b.walkimgs[d] = v
        }
        else if(k == Character.animKind.attack){
            b.attackimg[d] = v
        }
        else if(k == Character.animKind.stand){
            b.standimg[d] = v
        }
    }

    //%block
    //%group="属性"
    //%blockNamespace=玩家 
    //%blockId=setPlayerAbility block="设置玩家 %p=variables_get(player) %aKind 为 %v"
    //%weight=81
    //%inlineInputMode=inline
    //%v.defl=100
    export function setPlayerAbility(p: Player, k: aKind, v: number){
        if(k == aKind.hp){
            p.def = 100/v
        }
        else if(k == aKind.speed){
            p.speed = v
        }
        else if(k == aKind.wmax){
            p.maxWeapon = Math.min(Math.max(v-1, 1), 9)
        }
    }
    //%block
    //%group="属性"
    //%blockNamespace=玩家 
    //%blockId=setDeflWeapon block="设置玩家 %p=variables_get(player) 初始武器 为 %w"
    //%weight=80
    export function setDeflWeapon(p: Player, w: string){
        p.deflWeapon = w
    }

    //%block
    //%blockNamespace=玩家
    //%group="参数"
    //%blockId=getPlayer block="当前玩家"
    export function getPlayer(){
        return curPlayer
    }

    //%block
    //%blockNamespace=玩家
    //%group="参数"
    //%blockId=getPlayerCurWeapon block="当前玩家的主武器"
    export function getPlayerCurWeapon(){
        return curPlayer.curWeapon
    }

    //%block
    //%group="参数"
    //%blockNamespace=玩家
    //%blockId=playerHp block="%b=variables_get(player)当前血量"
    export function playerHp(b: Player){
        return b.hpbar.value/b.def
    }

    //%block
    //%group="参数"
    //%blockNamespace=玩家
    //%blockId=spriteToPlayer block="将精灵%b=variables_get(sprite)强制转换为玩家"
    //%weight=99
    export function spriteToPlayer(b: Sprite){
        return <Player>b
    }

    //------------- 拾取武器 -------------
    function getWeapon(){
        sprites.onOverlap(SpriteKind.Player, SpriteKind.weapon, function (sprite, otherSprite) {
            if(curPlayer != sprite){
                return
            }
            let player = (<Player>sprite);
            if (player.spareWeapon.length >= player.maxWeapon && otherSprite == player.oldWeapon) {
                return
            }
            //未持有武器或装备池已满，直接装备武器
            if(player.curWeapon == null || player.spareWeapon.length >= player.maxWeapon){
                player.oldWeapon = player.curWeapon
                if (player.oldWeapon != null) {
                    stopPassiveSkill(player.oldWeapon)
                    player.oldWeapon.setKind(SpriteKind.weapon)
                    player.oldWeapon.setVelocity(0, 0)
                    player.oldWeapon.ax = 0
                    player.oldWeapon.ay = 0
                    clearTimeout(player.clearOldWeapon)
                    player.clearOldWeapon = setTimeout(function() {
                        player.clearOldWeapon = -1
                        player.oldWeapon = null
                    }, 500)
                }
                equiWeapon(player, <Weapon.Weapon>otherSprite)
            } 
            //放进装备池
            else{
                pushWeapon(player, <Weapon.Weapon>otherSprite)
            }
        })
    }

    //装备武器
    function equiWeapon(player: Player, w: Weapon.Weapon){
        player.curWeapon = w
        w.dir = player.dir
        w.z = player.dir == 1 || player.dir == 2 ? player.z-1 : player.z+1
        player.curWeapon.setKind(SpriteKind.PlayerWeapon)
        clearInterval(player.curFollow)
        player.curFollow = -1
        w.setImage(w.images[player.dir])
        w.setPosition(player.x+w.offset[w.dir].x, player.y+w.offset[w.dir].y)
        weaponFollow(player, 10)
        startPassiveSkill(player)
        w.setFlag(SpriteFlag.Invisible, false)
        w.setFlag(SpriteFlag.Ghost, false)
    }

    //------------- 武器跟随 -------------
    function weaponFollow (p: Player, interval: number) {
        let w = p.curWeapon
        p.curFollow = setInterval(function() {
            if(w == null){
                clearInterval(p.curFollow)
                p.curFollow = -1
            }
            else if(p.attack == 0){
                w.setPosition(p.x+w.offset[w.dir].x, p.y+w.offset[w.dir].y)
                w.setVelocity(p.vx, p.vy)
                w.ax = p.ax
                w.ay = p.ay
            }
            else{
                w.setVelocity(0, 0)
            }
        }, interval)
    }

    //------------- 碰撞判定 -------------
    //Helper.bulletANDsprite(SpriteKind.EnemyBullet, SpriteKind.Player)

    //------------- 玩家被打败 -------------
    // sprites.onDestroyed(SpriteKind.Player, function(sprite: Player) {
    //     if(sprite == curPlayer){
    //         Maze.clearSprite(SpriteKind.PlayerServant)
    //         Maze.clearSprite(SpriteKind.PlayerWeapon)
    //         for(let sprite of sprites.allOfKind(SpriteKind.Enemy)){
    //             sprite.flags |= sprites.Flag.Destroyed;
    //         }
    //         Maze.stopCreateMonster()
    //         game.over()
    //     }
    // })

    //------------- 武器损坏 -------------
    sprites.onDestroyed(SpriteKind.PlayerWeapon, function(sprite: Sprite) {
        if(curPlayer.curWeapon == sprite){
            weaponDestroy(curPlayer)
        }
    })
}