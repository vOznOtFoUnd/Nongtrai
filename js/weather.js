export class WeatherManager {
  constructor(onWeatherChange) {
    this.onWeatherChange = onWeatherChange;
    this.currentWeather = 'sunny';
    this.timer = 0;
    this.changeInterval = 180;
  }

  update(dt, plots, onMessage) {
    this.timer += dt;
    if (this.timer >= this.changeInterval) {
      this.timer = 0;
      this.triggerRandomWeather(plots, onMessage);
    }
  }

  triggerRandomWeather(plots, onMessage) {
    const rand = Math.random();
    if (rand < 0.5) {
      this.currentWeather = 'sunny';
      if (onMessage) onMessage('Thời tiết: Trời nắng ráo ☀️');
    } else if (rand < 0.8) {
      this.currentWeather = 'rainy';
      if (onMessage) onMessage('Thời tiết: Trời mưa! Đất đã được tự động tưới nước 🌧️💧');
      plots.forEach(plot => {
        if (plot.state === 'planted' && !plot.watered) {
          plot.water();
        }
      });
    } else {
      this.currentWeather = 'drought';
      if (onMessage) onMessage('Thời tiết: Hạn hán kéo dài! Cây cối sẽ khô héo nhanh hơn 🌵');
    }

    if (this.onWeatherChange) {
      this.onWeatherChange(this.currentWeather);
    }
  }
}