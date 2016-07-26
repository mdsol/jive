<?php
include 'config.php';
error_reporting(E_ALL);
ini_set('display_errors', 1);
date_default_timezone_set('America/New_York');

class Avatars
{
    public  $mysqli;
    private $username;
    private $password;
    private $basicUrl;
    private $headers;
    private $apiCore;
    private $medifaces_player_table;
    private $jive_profile_table;
    private $medifaces_game_turn_table;
    
    public function __construct($data, $healthDashboard)
    {
        $this->mysqli = new mysqli($data['mysql_host'], $data['mysql_user'], $data['mysql_pass'], $data['mysql_db'], $data['mysql_port']);
        
        $this->mysqli->set_charset("utf8");
        if($this->mysqli->connect_error) {
            echo "Failed to connect to MySQL: (" . $this->mysqli->connect_errno . ") " . $this->mysqli->connect_error;
        }
        $this->basicUrl  = 'mdsol.jiveon.com';
        $this->apiCore   = '/api/core/v3/';

        //authentication
        $this->username  = $data['jive_username'];
        $this->password  = $data['jive_password'];


        $this->headers = array('Content-Type: application/json', 'Authorization: Basic '. base64_encode($this->username . ':' . $this->password));
        var_dump($this->username . $this->password);

        $this->medifaces_player_table  = $data['medifaces_player_table'];
        $this->jive_profile_table  = $data['jive_profile_table'];

        $this->medifaces_game_turn_table  = $data['medifaces_game_turn_table'];
    }

    public function testDelete()
    {
        try {
            $id = '27';
            $q1 = "SET FOREIGN_KEY_CHECKS=0;";
            $foreign1 = $this->mysqli->prepare($q1);
            $foreign1->execute();
            $foreign1->close();

            $query2 = "DELETE FROM `".$this->medifaces_player_table."` WHERE jive_profile_id = ?";
            $medifaces_player = $this->mysqli->prepare($query2);
            $medifaces_player->bind_param('s', $id);
            $medifaces_player->execute();
            $medifaces_player->close();
            
            $query1 = "DELETE FROM ".$this->jive_profile_table." WHERE id = ?";
            $jive_profile = $this->mysqli->prepare($query1);
            $jive_profile->bind_param('s', $id);
            $jive_profile->execute();
            $jive_profile->close();

            $q2 = "SET FOREIGN_KEY_CHECKS=1;";
            $foreign2 = $this->mysqli->prepare($q2);
            $foreign2->execute();
            $foreign2->close();
        } catch(Exception $e) {
            var_dump($e);
        }
    }

    public function detectExEmployee($old_employee, $current_employee)
    {
        $exemployee = array_diff($old_employee, $current_employee);
        var_dump($exemployee);

        $q1 = "SET FOREIGN_KEY_CHECKS=0;";
        $foreign1 = $this->mysqli->prepare($q1);
        $foreign1->execute();
        $foreign1->close();

        foreach($exemployee as $email) {
            

            $result = $this->mysqli->query("SELECT id FROM `".$this->jive_profile_table."` WHERE email = '".$email."' LIMIT 1");
            while($row = $result->fetch_assoc()) {
                echo $id = $row['id'];
                echo ' - ';
                
                $query2 = "DELETE FROM `".$this->medifaces_player_table."` WHERE jive_profile_id = ?";
                $medifaces_player = $this->mysqli->prepare($query2);
                $medifaces_player->bind_param('s', $id);
                $medifaces_player->execute();
                $medifaces_player->close();

                $query1 = "DELETE FROM ".$this->jive_profile_table." WHERE id = ?";
                $jive_profile = $this->mysqli->prepare($query1);
                $jive_profile->bind_param('s', $id);
                $jive_profile->execute();
                $jive_profile->close();
            }
        }
        foreach($old_employee as $old) {
            if (!in_array($old, $current_employee)) {
                echo $old;
                echo ' * ';
            }
        }
        $q2 = "SET FOREIGN_KEY_CHECKS=1;";
        $foreign2 = $this->mysqli->prepare($q2);
        $foreign2->execute();
        $foreign2->close();
    }

    public function milliseconds() {
        $mt = explode(' ', microtime());
        return $mt[1] * 1000 + round($mt[0] * 1000);
    }

    public function getAllPeopleEmail()
    {
        $url = $this->basicUrl . $this->apiCore . 'people?sort=firstNameAsc&fields=emails,-resources';
        
        //open connection
        do
        {
            $ch = curl_init();
            //set the url, number of POST vars, POST data  
            curl_setopt($ch, CURLOPT_HTTPHEADER, $this->headers);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);  
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, TRUE);  
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET' );

            $result = curl_exec($ch);
            $rawData = explode(";", $result);
            
            $rawData = $rawData[1];
            $parseData1 = json_decode($rawData);
            $parseData = $parseData1->list;
            
            foreach($parseData as $values) {
                $emails  = $values->emails;
                $user_id = $values->id;

                foreach($emails as $email_val) {
                    if($email_val->jive_label == 'Email') {
                        
                        $email = $email_val->value;

                        if((strpos($email,'+') === false) AND ($email != 'express@mdsol.com') AND ((strpos($email,'@mdsol.com') !== false))) { 
                            echo $email;
                            echo ' = ';
                            $url_email = $this->basicUrl . $this->apiCore . 'people/username/' . $email . '?-resources';

                            //open connection
                            $ch1 = curl_init();
                            //set the url, number of POST vars, POST data  
                            curl_setopt($ch1, CURLOPT_HTTPHEADER, $this->headers);
                            curl_setopt($ch1, CURLOPT_RETURNTRANSFER, TRUE );  
                            curl_setopt($ch1, CURLOPT_URL, $url_email);  
                            curl_setopt($ch1, CURLOPT_CUSTOMREQUEST, 'GET' );
                            curl_setopt($ch1, CURLOPT_FOLLOWLOCATION, TRUE);  

                            
                            $user_data = curl_exec($ch1);
                            curl_close($ch1);

                            $rawDataUser = substr($user_data, 43);
                            $parseDataUser = json_decode($rawDataUser);

                            if(isset($parseDataUser->photos)) {

                                $user_photos = $parseDataUser->photos;
                                $location    = $parseDataUser->location;
                                $image_path  = $user_photos[0]->value;
                                $image_name  = explode('@', $email);
                                $image_name  = $image_name[0].'.png';
                                $displayName = $parseDataUser->displayName;
                                $profile     = $parseDataUser->jive->profile;
                                
                                $user_title  = '';
                                $user_dept   = '';
                                $user_bio    = '';
                                $user_hire   = ''; 

                                foreach($profile as $prf) {

                                    if($prf->jive_label == 'Title') {
                                        $user_title = $prf->value;
                                    }
                                    
                                    if($prf->jive_label == 'Department') {
                                        $user_dept = $prf->value;
                                    }
                                    
                                    if($prf->jive_label == 'Biography') {
                                        $user_bio = $prf->value;
                                    }
                                    
                                    if($prf->jive_label == 'Hire Date') {
                                        $user_hire = $prf->value;
                                        $user_hire = explode('/', $user_hire);
                                        $user_hire = $user_hire[2].'-'.$user_hire[0].'-'.$user_hire[1].' 00:00:00';
                                    }
                                }

                                $ch2 = curl_init();
                                //set the url, number of POST vars, POST data
                                curl_setopt($ch2, CURLOPT_HTTPHEADER, $this->headers);
                                curl_setopt($ch2, CURLOPT_RETURNTRANSFER, TRUE );  
                                curl_setopt($ch2, CURLOPT_URL, $image_path);  
                                curl_setopt($ch2, CURLOPT_CUSTOMREQUEST, 'GET' );
                                curl_setopt($ch2, CURLOPT_FOLLOWLOCATION, TRUE);  

                                $user_image = curl_exec($ch2);
                                curl_close($ch2);

                                $date_now = date("Y-m-d H:i:s");
                                $query1 = "SELECT * FROM `".$this->jive_profile_table."` WHERE email = '" . $email . "' ";
                                $result1 = $this->mysqli->query($query1);
                                $row = $result1->fetch_assoc();

                                if($row) {

                                    $query_2 = "SELECT * FROM `".$this->medifaces_player_table."` WHERE jive_profile_id = '" . $row['id'] . "' ";
                                    $result_2 = $this->mysqli->query($query_2);
                                    $row_2 = $result_2->fetch_assoc();
                                    if(!$row_2) {
                                        echo '***UPDATE NOW***';
                                        $jp_id = $row['id'];
                                        $stmt1 = $this->mysqli->prepare("INSERT INTO `".$this->medifaces_player_table."` (`jive_profile_id`, `player_created`) VALUES (?,?)");
                                        $stmt1->bind_param('ss', $jp_id, $date_now);
                                        $stmt1->execute();
                                    }


                                    $id = $row['id'];
                                    if(($row['fullname'] != $displayName) || ($row['title'] != $user_title) || 
                                            ($row['department'] != $user_dept) || ($row['biography'] != $user_bio) || 
                                            ($row['hire_date']  != $user_hire) || $row['location'] != $location)
                                    {
                                        
                                        $stmt = $this->mysqli->prepare("UPDATE `".$this->jive_profile_table."` SET fullname = ?, title = ?, department = ?, biography = ?, hire_date = ?, location = ? WHERE id = ?");
                                        $stmt->bind_param('sssssss', $displayName, $user_title, $user_dept, $user_bio, $user_hire, $location, $id);
                                        $stmt->execute();
                                    }
                                    
                                    if(strlen($row['picture_binary']) != strlen($user_image)) {

                                        print strlen($row['picture_binary']) . ' <> ' . strlen($user_image);
                                        echo 'Update picture_binary ';
                                        echo "UPDATE `".$this->jive_profile_table."` SET picture_name = ?, picture_updated = ?, picture_binary = ? WHERE id = ?";
                                        echo $image_name.' - '.$date_now.' - '.$id;
                                        $stmt = $this->mysqli->prepare("UPDATE `".$this->jive_profile_table."` SET picture_name = ?, picture_updated = ?, picture_binary = ? WHERE id = ?");
                                        $stmt->bind_param('ssss', $image_name, $date_now, $user_image, $id);
                                        $stmt->execute();

                                        $reset_avatar = '0';
                                        $stmt1 = $this->mysqli->prepare("UPDATE `".$this->medifaces_player_table."` SET bad_avatar = ? WHERE jive_profile_id = ?");
                                        $stmt1->bind_param('ss', $reset_avatar, $id);
                                        $stmt1->execute();

                                    }
                                } else {
                                    echo 'insert ' . $email . ' & ';
                                    $stmt = $this->mysqli->prepare("INSERT INTO `".$this->jive_profile_table."` (fullname, email, title, department, biography, hire_date, location, picture_name, picture_updated, picture_binary) VALUES (?,?,?,?,?,?,?,?,?,?)");
                                    $stmt->bind_param('ssssssssss', $displayName, $email, $user_title, $user_dept, $user_bio, $user_hire, $location, $image_name, $date_now, $user_image);
                                    $stmt->execute();
                                    echo $new_id = $this->mysqli->insert_id;
                                    echo ' * ';
                                    $stmt1 = $this->mysqli->prepare("INSERT INTO `".$this->medifaces_player_table."` (`jive_profile_id`, `player_created`) VALUES (?,?)");
                                    $stmt1->bind_param('ss', $new_id, $date_now);
                                    $stmt1->execute();
                                }
                            }
                        }
                    }
                }
            }
            curl_close($ch);
            $url = false;

            if(isset($parseData1->links)) {
              if($parseData1->links->next !== 'undefined') 
                $url = $parseData1->links->next; 
            }

        } while($url);

        $this->deleteDeactivatedAccount();
        $this->deleteDeletedAccounts();

    }

    public function deleteDeactivatedAccount()
    {
        echo '*** Delete deactivated accounts Start: ***';
        $authentication = 'Authorization: Basic '. base64_encode($this->username . ':' . $this->password);
        $url = "mdsol.jiveon.com/api/core/v3/people?filter=include-disabled(true)";
        
        $q1 = "SET FOREIGN_KEY_CHECKS=0;";
        $foreign1 = $this->mysqli->prepare($q1);
        $foreign1->execute();
        $foreign1->close();

        do
        {
            $ch = curl_init();
            //set the url, number of POST vars, POST data  
            curl_setopt($ch, CURLOPT_URL, $url);  
            curl_setopt($ch, CURLOPT_HTTPHEADER, $this->headers);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);  
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, TRUE);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');

            $result = curl_exec($ch);
            if(curl_errno($ch))
                echo 'Curl error: '.curl_error($ch);

            $rawData = explode(";", $result);
            $rawData = $rawData[1];
            $parseData1 = json_decode($rawData);
            $parseData = $parseData1->list;
            
            foreach($parseData as $values) {
                $jive  = $values->jive;
                
                if($jive->enabled == false) {

                    // var_dump($values);
                    $emails = $values->emails;
                    $primary_email = '';
                    foreach($emails as $email) {
                        if(property_exists($email, 'primary')) {
                            if(strpos($email->value,'@mdsol.com') !== false || strpos($email->value,'@medidatasolutions.com') !== false) {
                                $primary_email = $email->value;
                                break;
                            }
                        }
                    }

                    if($primary_email != '') {
                        $result = $this->mysqli->query("SELECT id, email FROM `".$this->jive_profile_table."` WHERE email = '".$primary_email."' LIMIT 1");
                        while($row = $result->fetch_assoc()) {
                            
                            $id = $row['id'];
                            // echo ' - ';
                            echo '*** ' . $row['email'] . ' ***';

                            $query2 = "DELETE FROM `".$this->medifaces_player_table."` WHERE jive_profile_id = ?";
                            $medifaces_player = $this->mysqli->prepare($query2);
                            $medifaces_player->bind_param('s', $id);
                            $medifaces_player->execute();
                            $medifaces_player->close();

                            $query1 = "DELETE FROM ".$this->jive_profile_table." WHERE id = ?";
                            $jive_profile = $this->mysqli->prepare($query1);
                            $jive_profile->bind_param('s', $id);
                            $jive_profile->execute();
                            $jive_profile->close();
                        }
                    }
                }
            }
            curl_close($ch);
            $url = false;

            if(isset($parseData1->links)) {
              if($parseData1->links->next !== 'undefined') 
                $url = $parseData1->links->next; 
            }

        } while($url);

        $q1 = "SET FOREIGN_KEY_CHECKS=1;";
        $foreign1 = $this->mysqli->prepare($q1);
        $foreign1->execute();
        $foreign1->close();

        echo '*** Delete End: ***';
    }
    
    public function deleteDeletedAccounts()
    {
        echo '*** Delete deleted accounts Start: ***';
        
        $q1 = "SET FOREIGN_KEY_CHECKS=0;";
        $foreign1 = $this->mysqli->prepare($q1);
        $foreign1->execute();
        $foreign1->close();

        $result = $this->mysqli->query("SELECT * FROM `".$this->jive_profile_table."`");
        while($row = $result->fetch_assoc()) {
            
            $email = $row['email'];
            $user_id = $row['id'];
            // echo ' - ';
            echo '*** ' . $row['email'] . ' ***';

            $url_email = $this->basicUrl . $this->apiCore . 'people/username/' . $email . '?-resources';

            //open connection
            $ch1 = curl_init();
            //set the url, number of POST vars, POST data  
            curl_setopt($ch1, CURLOPT_HTTPHEADER, $this->headers);
            curl_setopt($ch1, CURLOPT_RETURNTRANSFER, TRUE );  
            curl_setopt($ch1, CURLOPT_URL, $url_email);  
            curl_setopt($ch1, CURLOPT_CUSTOMREQUEST, 'GET' );
            curl_setopt($ch1, CURLOPT_FOLLOWLOCATION, TRUE);  
            
            $user_data = curl_exec($ch1);
            curl_close($ch1);

            $rawDataUser = substr($user_data, 43);
            $parseDataUser = json_decode($rawDataUser);
            if(isset($parseDataUser->error->status)) {
                if($parseDataUser->error->status == 404) {
                    echo "*** DELETED from table ***";
                    $query2 = "DELETE FROM `".$this->medifaces_player_table."` WHERE jive_profile_id = ?";
                    $medifaces_player = $this->mysqli->prepare($query2);
                    $medifaces_player->bind_param('s', $user_id);
                    $medifaces_player->execute();
                    $medifaces_player->close();

                    $query1 = "DELETE FROM ".$this->jive_profile_table." WHERE id = ?";
                    $jive_profile = $this->mysqli->prepare($query1);
                    $jive_profile->bind_param('s', $user_id);
                    $jive_profile->execute();
                    $jive_profile->close();
                }
            }
        }
        $q1 = "SET FOREIGN_KEY_CHECKS=1;";
        $foreign1 = $this->mysqli->prepare($q1);
        $foreign1->execute();
        $foreign1->close();

        echo '*** Delete End: ***';
    }
}

echo '========== ProD =======';
echo date("Y-m-d H:i:s");
echo '==============================';
$avatars = new Avatars($data);
$avatars->getAllPeopleEmail();
echo '============= END ProD ========';
echo date("Y-m-d H:i:s");
echo '==============================';

function milliseconds() {
    $mt = explode(' ', microtime());
    return $mt[1] * 1000 + round($mt[0] * 1000);
}
?>