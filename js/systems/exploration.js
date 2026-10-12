import { state, saveGame } from '../data/state.js';
import { backpackCapacity, backpackUsed } from './inventory.js';

export const ISLANDS = {
  driftwood: { id:'driftwood', name:'Đảo Gỗ Trôi', emoji:'🌴', minBoat:0, cost:45, description:'Bờ biển có gỗ, dây thừng và vỏ sò.', rewards:{ wood:[2,5], rope:[1,2], shells:[1,3], stone:[0,2] } },
  reef: { id:'reef', name:'Đảo Rạn San Hô', emoji:'🪸', minBoat:1, cost:90, description:'Rạn san hô có tinh thể và cá biển hiếm.', rewards:{ shells:[2,4], crystal:[1,2], copperOre:[1,3], islandRelics:[0,1] } },
  mist: { id:'mist', name:'Đảo Sương Mù', emoji:'🌫️', minBoat:2, cost:150, description:'Hòn đảo xa với quặng sắt và cổ vật.', rewards:{ ironOre:[2,4], crystal:[1,3], wood:[1,3], islandRelics:[1,2] } }
};

const rand = ([min,max]) => Math.floor(Math.random()*(max-min+1))+min;

export function mineResources() {
  if ((state.forge?.pickaxeLevel || 0) < 1) return {ok:false,message:'Cần chế tạo cuốc chim tại lò rèn trước khi khai thác.'};
  const r = state.inventory.resources;
  const loot = { stone: rand([1,2+(state.forge.pickaxeLevel>=2?1:0)]) };
  if (Math.random() < 0.62) loot.copperOre = rand([1, state.forge.pickaxeLevel>=2?3:2]);
  if (Math.random() < 0.24 + (state.forge.pickaxeLevel>=3?0.15:0)) loot.ironOre = rand([1,2]);
  if (Math.random() < 0.04 + (state.forge.pickaxeLevel>=3?0.04:0)) loot.crystal = 1;
  const count = Object.values(loot).reduce((a,b)=>a+b,0);
  if (backpackUsed()+count>backpackCapacity()) return {ok:false,message:'Ba lô không đủ chỗ để mang quặng. Hãy cất đồ vào kho.'};
  for (const [id,n] of Object.entries(loot)) r[id]=(r[id]||0)+n;
  saveGame();
  return {ok:true,loot};
}

export function smeltOre(type) {
  const recipes = {
    copper: { ore:'copperOre', ingot:'copperIngot', cost:12, name:'đồng' },
    iron: { ore:'ironOre', ingot:'ironIngot', cost:20, name:'sắt' }
  };
  const recipe=recipes[type];
  if (!recipe) return {ok:false,message:'Công thức nung không tồn tại.'};
  if ((state.inventory.resources[recipe.ore]||0)<3 || state.money<recipe.cost) return {ok:false,message:`Cần 3 quặng và ${recipe.cost} xu để nung ${recipe.name}.`};
  state.inventory.resources[recipe.ore]-=3;
  state.inventory.resources[recipe.ingot]=(state.inventory.resources[recipe.ingot]||0)+1;
  state.money-=recipe.cost; saveGame();
  return {ok:true,message:`Nung thành công 1 thỏi ${recipe.name}.`};
}

export function craftPickaxe() {
  const level=Number(state.forge.pickaxeLevel)||0;
  if(level===0) {
    if(state.money<100 || (state.inventory.crops.wheat||0)<2) return {ok:false,message:'Cần 100 xu và 2 lúa mì để chế tạo cuốc chim cơ bản.'};
    if(backpackUsed()+1>backpackCapacity()) return {ok:false,message:'Ba lô đã đầy.'};
    state.money-=100; state.inventory.crops.wheat-=2; state.forge.pickaxeLevel=1;
  } else {
    if(level>=3) return {ok:false,message:'Cuốc chim đã đạt cấp tối đa.'};
    const ore=level===1?'copperIngot':'ironIngot';
    const cost=level===1?120:220;
    if((state.inventory.resources[ore]||0)<2 || state.money<cost) return {ok:false,message:`Cần 2 ${ore==='copperIngot'?'thỏi đồng':'thỏi sắt'} và ${cost} xu để nâng cấp.`};
    state.inventory.resources[ore]-=2; state.money-=cost; state.forge.pickaxeLevel++;
  }
  saveGame(); return {ok:true,level:state.forge.pickaxeLevel};
}

export function upgradeBoat() {
  const level=Number(state.forge.boatLevel)||0;
  if(level>=3) return {ok:false,message:'Thuyền đã đạt cấp tối đa.'};
  const cost=[80,150,250][level];
  const wood=[2,4,6][level];
  const rope=[1,2,3][level];
  const ingot=level===0?'copperIngot':'ironIngot';
  const ingotQty=level===0?1:2;
  if(state.money<cost || (state.inventory.resources.wood||0)<wood || (state.inventory.resources.rope||0)<rope || (state.inventory.resources[ingot]||0)<ingotQty)
    return {ok:false,message:`Thiếu vật liệu nâng thuyền: ${cost} xu, ${wood} gỗ, ${rope} dây và ${ingotQty} thỏi ${ingot==='copperIngot'?'đồng':'sắt'}.`};
  state.money-=cost; state.inventory.resources.wood-=wood; state.inventory.resources.rope-=rope; state.inventory.resources[ingot]-=ingotQty;
  state.forge.boatLevel++; saveGame(); return {ok:true,level:state.forge.boatLevel};
}

export function exploreIsland(islandId) {
  const island=ISLANDS[islandId];
  if(!island) return {ok:false,message:'Không tìm thấy điểm thám hiểm.'};
  const boatLevel=Number(state.forge.boatLevel)||0;
  if(boatLevel<island.minBoat) return {ok:false,message:`Cần thuyền cấp ${island.minBoat} để tới ${island.name}.`};
  if(state.money<island.cost) return {ok:false,message:`Cần ${island.cost} xu cho chuyến đi.`};
  const rewards={};
  for(const [id,range] of Object.entries(island.rewards)) {
    const n=rand(range);
    if(n>0) rewards[id]=n;
  }
  const total=Object.values(rewards).reduce((a,b)=>a+b,0);
  if(backpackUsed()+total>backpackCapacity()) return {ok:false,message:'Ba lô không đủ chỗ cho chiến lợi phẩm. Cất đồ trước khi ra khơi.'};
  state.money-=island.cost;
  for(const [id,n] of Object.entries(rewards)) state.inventory.resources[id]=(state.inventory.resources[id]||0)+n;
  if(!state.forge.exploredIslands.includes(islandId)) state.forge.exploredIslands.push(islandId);
  saveGame(); return {ok:true,island,rewards};
}
