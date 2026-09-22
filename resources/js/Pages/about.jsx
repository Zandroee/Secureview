import "../../css/whyline.css";
import Navbar from '../Components/navbar';
import Footer from '../Components/footer';

export default function About() {
    return (
        <>
        {/* HEADER SECTION */}
            <Navbar />
            <header className="d-flex align-items-center text-white">
                <div className="container-fluid" style={{ paddingLeft: 0, paddingRight: 0 }}>
                    <div className="row">

                        <div className="col-12 position-relative text-center">
                            <img src="/images/AboutHeader.jpg" className="img-fluid" style={{ width: "100%", height: "400px", objectFit: "cover" }} alt="AboutHeader"></img>
                        
                        <div
                        className="position-absolute top-50 start-50 translate-middle text-center" style ={{marginTop: "50px"}}>
                            <h1 className="display-4 fw-bold">ABOUT US</h1> 

                            <p className="lead" style={{ color: "white", fontSize: "1.25rem", marginTop: "-10px" }}>who are we?</p>
                        </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* NETMAX Section */}
            <section className="py-5">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-md-6 mb-4 mb-md-0">
                            <img src="/images/NETMAX.jpg" className="img-fluid rounded" alt="AboutUs"></img>
                        </div>
                        <div className="col-md-6">
                            <h2 className="fw-bold mb-4 text-primary" style={{ fontFamily: "Outfit, sans-serif" }}>NETMAX TRADING</h2>
                            <p className="lead mb-4" style = {{ fontFamily: "Outfit, sans-serif," }}>Our company, Netmax Trading, are experts in IT industries with over 10+ years of experiences in this field. We specialize in CCTV operations as well as different Auxilliaries with several brand partnerships.</p>
                        </div>
                    </div>
                </div>
            </section>
            <section className="py-5">  
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-md-6 mb-4 mb-md-0">
                            <h2 className="fw-bold mb-4 text-primary" style={{ fontFamily: "Outfit, sans-serif" }}>OUR MISSION</h2>
                            <p className="lead mb-4" style = {{ fontFamily: "Outfit, sans-serif," }}>Our mission is to provide our customers with the best products and services in the industry. We strive to exceed our customers' expectations and to be a trusted partner in their success.</p>
                        </div>
                        <div className="col-md-6">
                            <img src="/images/OurMission.jpg" className="img-fluid rounded" alt="Mission"></img>
                        </div>
                    </div>
                </div>
            </section>

            {/* NETMAX Section */}
            <section className="py-5">
                <div className="container-fluid">

                    <div className="why-line"></div>
                    <h3 className="fw-bold mb-4 text-center text-primary" style={{ fontFamily: "Outfit, sans-serif" }}>WHY CHOOSE US?</h3>

                <div className="row text-center justify-content-center">
                    <div className="col-md-3">
                        <img src="/images/Check.jpg" className="check icon" alt="Check"></img>
                        <h3>Certified Technicians</h3>
                        <p>With 11 years of IT Experience from <br/>Computers to different Auxilliaries.</p>
   
                </div>
                    <div className="col-md-3">
                        <img src="/images/Check.jpg" className="check icon" alt="Check"></img>
                        <h3> Philgreps Certification</h3>
                        <p>Centralized Electronic portal that <br/> Serves Source of Information on<br/> Government procurement.</p>
                        
                </div>
                <div className="col-md-3">
                        <img src="/images/Check.jpg" className="check icon" alt="Check"></img>
                        <h3>Brand Partnership</h3>
                        <p>Well-known CCTV brands like<br/> Hikvision, Duhua and UIV are <br/>partners with us.</p>
                </div>
                <div className="col-md-3">
                        <img src="/images/Check.jpg" className="check icon" alt="Check"></img>
                        <h3>Operated Nationwide</h3>
                        <p>Througout the years, this company<br/>have operated from Luzon,<br/> Visayas and Mindanao.</p>
                        </div>
                </div>

                </div>
            </section>
        </>
    );
}