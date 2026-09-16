import { useState } from 'react';
import Navbar from '../Components/navbar';
import PasswordInput from "../Components/PasswordInput";
import PasswordStrength from '../Components/PasswordStrength';


import '../../css/signup.css';


export default function Signup(){
    // password state, para malaman kung ano yung mga requirements na na-met or hindi.
    const [password, setPassword] = useState("");

    //para malaman kung parehas ang password and confirm pass. kasama yung line 13.
    const [confirmPassword, setConfirmPassword] = useState("");

    //for checkbox state, terms and conditions button
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    //error state
    const [passwordError, setPasswordError] = useState("");

    //terms error state
    const[termsError, setTermsError] = useState("");

     //forms error state
    const[formError, setFormError] = useState("");

    //email error state
    const[emailError,setEmailError] = useState("");

    

    
    // live password matching
    const passwordMatch = password === confirmPassword && confirmPassword !== "";


    const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    });

    // Handling create button
    const handleSubmit = (e) => {
        e.preventDefault();

        setFormError("");
        setEmailError("");
        setPasswordError("");
        setTermsError("");

        if(
            !formData.firstName ||
            !formData.lastName ||
            !formData.phone ||
            !formData.email ||
            !password ||
            !confirmPassword
        ) {
            setFormError("Please fill in all required fields");
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(formData.email)){
            setEmailError("Please enter a valid email address");
            return;
        }

        if(password !== confirmPassword){
            setPasswordError("Passwords do not match");
            return;
        }

        if(!acceptedTerms){
            setTermsError("Please accept Terms and Conditions");
            return;
        }

        alert("Account can be created");
    }

    

    return(
        <>
            <Navbar/>

            <section id="signup-page"> 
                    <h1 className="signup-title">SECUREVIEW</h1>
                

                <div className="signup-container">
                    <h2>
                        CREATE AN ACCOUNT
                    </h2>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                            <label className="form-label">
                            First Name
                        </label>

                        <input
                            type="text"
                            className="form-control"
                            placeholder="First Name"
                            value={formData.firstName}
                            onChange={(e)=>setFormData({
                             ...formData,
                             firstName:e.target.value
                             })}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                                Last Name
                            </label>

                        <input
                            type="text"
                            className="form-control"
                            placeholder="Last Name"
                            value={formData.lastName}
                            onChange={(e)=>setFormData({
                                ...formData,
                                lastName:e.target.value
                             })}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                                Phone no.
                            </label>

                        <input
                            type="text"
                            className="form-control"
                            placeholder="09*********"
                            value={formData.phone}
                            onChange={(e)=>setFormData({
                                ...formData,
                                phone:e.target.value
                             })}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                            Email
                            </label>

                        <input
                            type="email"
                            className="form-control"
                            placeholder="Email"
                            value={formData.email}
                            onChange={(e)=> {
                                setFormData({
                                ...formData,
                                email:e.target.value
                             });

                             setEmailError("");
                            }}
                            />

                            {emailError && (
                                <p className="invalid">
                                    {emailError}
                                </p>
                            )}
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                                Password
                            </label>
                                <PasswordInput
                                    value={password}
                                    onChange={(e)=>{
                                        setPassword(e.target.value);
                                        setPasswordError("");
                                    }}
                                    placeholder="Password"
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                            Confirm Password
                            </label>

                            <PasswordInput
                                value={confirmPassword}
                                onChange={(e)=>{
                                    setConfirmPassword(e.target.value);
                                     setPasswordError("");
                                }}
                                placeholder="Confirm Password"
                            />
                        </div>
                            {passwordError && (
                            <p className="invalid">
                                {passwordError}
                            </p>
                            )}

                            {confirmPassword && (
                                <p className={passwordMatch ? "valid" : "invalid"}>
                                    {
                                        passwordMatch
                                        ? "Passwords match"
                                        : "Passwords do not match"
                                    }
                                </p>
                            )}

                            <PasswordStrength password={password}/>

                        <div className="form-check mb-3">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => {
                                    setAcceptedTerms(e.target.checked);
                                    setTermsError("");
                                }}
                            />

                            <label className="form-check-label">
                                I agree to the Terms and Conditions
                            </label>

                            {termsError && (
                                <p className="invalid">
                                    {termsError}
                                </p>
                            )}
                        </div>
                        
                        {formError && (
                            <p className="invalid">
                                {formError}
                            </p>
                        )}

                        <button 
                            type="submit"
                            className="signup-button"
                        >
                            CREATE ACCOUNT
                        </button>
                    
                        </form>
                    </div>
            </section>
        </>
    
    );
}