//Code:https://apis.scrimba.com/unsplash/photos/random?orientation=landscape&query=nature
const topDiv= document.querySelector(".top")
const timeH1 = document.querySelector(".time")
const weatherCont = document.querySelector(".weather")

setInterval(()=>{
    let time = new Date;
    timeH1.textContent=time.toLocaleTimeString("en-us",{timeStyle:"short"})
},1000)

navigator.geolocation.getCurrentPosition((position)=>{
    console.log(position);
    fetch(`https://apis.scrimba.com/openweathermap/data/2.5/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}&units=metric`).then((res)=>{
        return res.json()
    }).then((data)=>{
        console.log(data);
        let temp = Math.round(`${data.main.temp}`)
        weatherCont.innerHTML=`<p><img src="http://openweathermap.org/img/wn/${data.weather[0].icon}.png">${temp}°C</p>
        <p class="weather-city">${data.name}</p>`
    }).catch((error)=>{
        console.log(error);
    })
})

fetch("https://apis.scrimba.com/unsplash/photos/random?orientation=landscape&query=nature").then((res)=>{
    if (!res.ok) {
        throw Error("Weather data not available")
    }
    return res.json();
}).then((data)=>{
    // console.log(data);
    
    document.body.style.backgroundImage = `url(${data.urls.full})`
    let authorP =  document.querySelector(".author")
    authorP.textContent = `By: ${data.user.name}`
    
}).catch((error)=>{
    document.body.style.backgroundImage = `url(https://images.unsplash.com/photo-1483206048520-2321c1a5fb36?crop=entropy&cs=srgb&fm=jpg&ixid=M3wxNDI0NzB8MHwxfHJhbmRvbXx8fHx8fHx8fDE3NDQ2MTkyMDh8&ixlib=rb-4.0.3&q=85)`
})

fetch("https://api.coingecko.com/api/v3/coins/bitcoin").then((res)=>{
    if(!res.ok){
        throw new Error("Something Went Wrong")
    }
    return res.json()
}).then((data)=>{
    // console.log(data);
    const cryptoCont = document.querySelector(".crypto-value");
    cryptoCont.innerHTML = `<div class="img-cont"><img src='${data.image.small}'> ${data.name}</div>
    <p class="crypto-price">Current Price: ₹${data.market_data.current_price.inr}</p>
    <p class="crypto-price">High 24Hr: ₹${data.market_data.high_24h.inr}</p>
    <p class="crypto-price">Low 24Hr: ₹${data.market_data.low_24h.inr}</p>`
}).catch((error)=>{
    console.log(error);
})

