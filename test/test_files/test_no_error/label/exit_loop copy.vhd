package exit_in_procedure is

end package;
package body exit_in_procedure is
  procedure ReadSpecification is
    variable Empty : boolean; -- vhdl-linter-disable-line unused
  begin

     ReadLineLoop : while true loop
      ReadLoop : loop 
        exit ReadLineLoop when Empty;
        exit ReadLoop when Empty;
      end loop; 
    end loop;
  end procedure;
end package body;
  