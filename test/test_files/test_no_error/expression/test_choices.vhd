package test_choices is
end package;
package body test_choices is
  function foo return integer is
    type AlertType is (failure, error, warning);  -- NEVER
    subtype AlertIndexType is AlertType range failure to warning;

    type AlertCountType is array (AlertIndexType) of integer;

    variable AlertPrintCount : AlertCountType;  -- vhdl-linter-disable-line unused

  begin
    AlertPrintCount := (warning         => integer'right, others => 0);
    AlertPrintCount := (error | warning => integer'right, others => 0);  -- testing this choices thing


    AlertPrintCount := (failure | error | warning => integer'right);


  end function;
end package body;
