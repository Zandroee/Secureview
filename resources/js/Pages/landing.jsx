import '../../css/landing.css';
import Navbar from '../Components/navbar';

export default function landing() {
    return (
        <>
            <Navbar />
            
            <section id="hero">
                <img
                    src="/images/cctv-cameras.jpg"
                    className="heroimg"
                    alt="CCTV cameras"
                />

                <div className="items">
                    <h1>Secure Your Home or Your Business</h1>
                    <h2>
                        Secure them with our optimal CCTV packages offers just for you!
                    </h2>

                    <div className="buttons">
                        <a href="/packages">VIEW PACKAGES</a>
                        <a href="/products">BROWSE CAMERAS</a>
                    </div>
                </div>
            </section>

            <section id="featured-packages">
                <h1>FEATURED CCTV PACKAGES</h1>
                <a href="/packages">VIEW ALL</a>

                <section id="cards-frame">
                    <div className="card-1">
                        <img
                            src="/images/package-1.jpg"
                            alt="4 Channel HikVision Dome Cameras"
                        />

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

            <section id="featured-cameras">
            </section>
        </>
    );
}