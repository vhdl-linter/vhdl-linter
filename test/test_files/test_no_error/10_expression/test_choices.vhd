package test_choices is
end package;
package body test_choices is
function foo return integer is
  type     AlertType            is (FAILURE, ERROR, WARNING) ;  -- NEVER
  subtype  AlertIndexType       is AlertType range FAILURE to WARNING ;

  type     AlertCountType       is array (AlertIndexType) of integer ;

  variable      AlertPrintCount     : AlertCountType ; -- vhdl-linter-disable-line unused

begin
      AlertPrintCount     := ( WARNING => integer'right) ;
      AlertPrintCount     := (ERROR | WARNING => integer'right) ; -- testing this choices thing


      AlertPrintCount     := (FAILURE | ERROR | WARNING => integer'right) ;


end function;
end package body;