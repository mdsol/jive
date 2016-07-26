<?php 
error_reporting(E_ALL);
ini_set('display_errors', 1);
date_default_timezone_set('America/New_York');
include 'config.php';

$content = '';
try {
        // open the connection to the database - $host, $user, $password, $database should already be set
        $mysqli = new mysqli($data['mysql_host'], $data['mysql_user'], $data['mysql_pass'], $data['mysql_db'], $data['mysql_port']);

        // did it work?
        if ($mysqli->connect_errno) {
            throw new Exception("Failed to connect to MySQL: " . $mysqli->connect_error);
        }
        
        // put a few comments into the SQL file
        $content  = "-- pjl SQL Dump\n";
        $content .= "-- Server version:".$mysqli->server_info."\n";
        $content .= "-- Generated: ".date('Y-m-d h:i:s')."\n";
        $content .= '-- Current PHP version: '.phpversion()."\n";
        $content .= '-- Host: '.$host."\n";
        $content .= '-- Database:'.$database."\n";

        $aTables = array($data['jive_profile_table'], $data['medifaces_player_table'], $data['medifaces_game_turn_table'], $data['medifaces_review_table']);
        // $aTables = array('jive_profile');
        //now go through all the tables in the database
        foreach($aTables as $table)
        {
            $content .= "-- --------------------------------------------------------\n";
            $content .= "-- Structure for '". $table."'\n";
            $content .= "--\n\n";

            // remove the table if it exists
            $content .= 'DROP TABLE IF EXISTS '.$table.';';

            // ask MySQL how to create the table
            $strSQL = 'SHOW CREATE TABLE '.$table;
            if (!$res_create = $mysqli->query($strSQL))
                throw new Exception("MySQL Error: " . $mysqli->error . 'SQL: '.$strSQL);
            $row_create = $res_create->fetch_assoc();

            $content .= "\n".$row_create['Create Table'].";\n";

            $content .= "-- --------------------------------------------------------\n";
            $content .= '-- Dump Data for `'. $table."`\n";
            $content .= "--\n\n";
            $res_create->free();

            // get the data from the table
            $strSQL = 'SELECT * FROM '.$table;
            if (!$res_select = $mysqli->query($strSQL))
                throw new Exception("MySQL Error: " . $mysqli->error . 'SQL: '.$strSQL);

            // get information about the fields
            $fields_info = $res_select->fetch_fields();
            // now we can go through every field/value pair.
            // for each field/value we build a string strFields/strValues
            while ($values = $res_select->fetch_assoc()) {
                $strFields = '';
                $strValues = '';
                foreach ($fields_info as $field) {
                    if($field->name != "picture_binary") {
                        if ($strFields != "") $strFields .= ",";
                        $strFields .= "`" . $field->name . "`";
                        // put quotes round everything - MYSQL will do type convertion (I hope) - also strip out any nasty characters
                        if ($strValues != "") $strValues .= ",";
                        $values[$field->name] = str_replace("'", "\'", $values[$field->name]);
                        $values[$field->name] = str_replace('"', '\"', $values[$field->name]);
                        $strValues .= '"'.preg_replace('/[^(\x20-\x7F)\x0A]*/','',$values[$field->name].'"');
                    }
                }
                $content .= "INSERT INTO ".$table." (".$strFields.") VALUES (".$strValues.");\n";
            }
            $content .= "\n\n\n";

            $res_select->free();            
        }

} catch (Exception $e) {
    print($e->getMessage());
}

$handle = fopen(dirname(__FILE__).'/db-backup-'.time().'.sql','w+') or die("Unable to write filename for output");
fwrite($handle,$content);
fclose($handle);

$mysqli->close();

var_dump('Done');
function milliseconds() {
    $mt = explode(' ', microtime());
    return $mt[1] * 1000 + round($mt[0] * 1000);
}