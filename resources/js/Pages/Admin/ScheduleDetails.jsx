import AdminInquiryDetails from "./InquiryDetails";

export default function AdminScheduleDetails(props) {
    return (
        <AdminInquiryDetails
            {...props}
            fromSchedule={true}
            fromHistory={false}
        />
    );
}
