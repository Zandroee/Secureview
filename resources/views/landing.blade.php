<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SecureView</title>
    @vite(['resources/css/landing.css'])
</head>
<body>
    <section id="header">
        <a href="#" class="logo">SECUREVIEW</a>

        <div>
            <ul id="navbar">
                <li><a href="{{ route('home') }}">HOME</a></li>
                <li><a href="{{ route('products') }}">PRODUCTS</a></li>
                <li><a href="{{ route('packages') }}">PACKAGES</a></li>
                <li><a href="{{ route('about') }}">ABOUT</a></li>
                <li><a href="{{ route('login') }}" class="login">LOG IN</a></li>
                <li><a href="{{ route('signup') }}" class="signup">SIGN UP</a></li>
            </ul>
        </div>
    </section>

    <section id="hero">
        <img src="{{ asset('images/cctv-cameras.jpg') }}" class="heroimg" alt="Hero Image">

        <div class="items">
            <h1>Secure Your Home or Your Business</h1>
            <h2>Secure them with our optimal CCTV packages offers just for you!</h2>
            
            <div class="buttons">
                <a href="#">VIEW PACKAGES</a>
                <a href="#">BROWSE CAMERAS</a>
            </div>
        </div>
    </section>

    <section id="featured-packages">
        <h1>FEATURED CCTV PACKAGES</h1>
        <a href="">VIEW ALL</a>

        <section id="cards-frame">
            <div class="card-1">
                <img src="/images" alt="card-1-img">
                <p>4 Channel HikVision Dome Cameras</p>
                <ul>
                    <li>HikVision 1080p Wide Display</li>
                    <li>Perfect For Indoor Surveillance</li>
                    <li>DVR Included</li>
                    <li>Free Installation w/ 6 Months Warranty</li>
                </ul>
                <button>DETAILS</button>
            </div>
        </section>
    </section>

    <section id="featured-cameras"></section>
</body>
</html>