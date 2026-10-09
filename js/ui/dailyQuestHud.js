function renderDailyQuestHud(){
 const box=document.getElementById('daily-quest-hud'),count=document.getElementById('daily-quest-count');if(!box||!count)return;
 const qs=Array.isArray(gameState.quests)?gameState.quests:[];const done=qs.filter(q=>q.completed||q.claimed).length;count.textContent=`${done}/${qs.length||3}`;
 const hasReward=qs.some(q=>q.completed&&!q.claimed);count.classList.toggle('animate-pulse',hasReward);count.title=hasReward?'Có nhiệm vụ đã hoàn thành, nhấn để nhận thưởng':'Nhấn để xem nhiệm vụ hằng ngày';
}
