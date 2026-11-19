import { Injectable, HttpException, Res, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { autocompletadoResidenteDto } from './dtos/autocompletadoResidenteDto';
import { InjectRepository } from '@nestjs/typeorm';
import { Residente } from 'src/modulos/residentes/entities/residente.entity';
import { Repository } from 'typeorm';
import { Encargado } from 'src/modulos/residentes/entities/encargado.entity';

@Injectable()
export class CedulasService {

  
  private readonly baseUrl = 'https://apis.gometa.org/cedulas';

  constructor(

    @InjectRepository(Residente)
    private residenteRepository: Repository<Residente>,

    @InjectRepository(Encargado)
    private encargadoRepository: Repository<Encargado>,

    private readonly httpService: HttpService) {}

  async consultarCedula(cedula: string) {
    if (process.env.EXTERNAL_SERVICES === 'disabled') throw new BadRequestException('External lookups disabled');
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/${cedula}`),
      );

      return this.autocompletadoCedula(response.data);
    } catch (error) {
      const axiosError = error as AxiosError;

      throw new HttpException(
        axiosError.response?.data || 'Error al consultar la cédula',
        axiosError.response?.status || 500,
      );
    }
  }

  async autocompletadoCedula(data: any): Promise<autocompletadoResidenteDto> {

    const persona = data.results?.[0];

    if (!persona) {
      throw new BadRequestException('No se encontró información para esta cédula');
    }

    const residenteExistente = await this.residenteRepository.findOne({ where: { cedula: persona?.cedula } });

    if (residenteExistente) {
      throw new BadRequestException('La cédula ya existe en el sistema');
    }

    const dto = new autocompletadoResidenteDto();
    dto.firstname = persona?.firstname || '';
    dto.lastname1 = persona?.lastname1 || '';
    dto.lastname2 = persona?.lastname2 || '';

    return dto;
  }

  async consultarCedulaEncargado(cedula: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/${cedula}`),
      );

      return this.autocompletadoCedulaEncargado(response.data);
    } catch (error) {
      const axiosError = error as AxiosError;

      throw new HttpException(
        axiosError.response?.data || 'Error al consultar la cédula',
        axiosError.response?.status || 500,
      );
    }
  }

  async autocompletadoCedulaEncargado(data: any): Promise<autocompletadoResidenteDto> {

    const persona = data.results?.[0];

    if (!persona) {
      throw new BadRequestException('No se encontró información para esta cédula');
    }

    const encargadoExistente = await this.encargadoRepository.findOne({ where: { cedula: persona?.cedula } });

    if (encargadoExistente) {
      throw new BadRequestException('La cédula ya existe en el sistema');
    }

    const dto = new autocompletadoResidenteDto();
    dto.firstname = persona?.firstname || '';
    dto.lastname1 = persona?.lastname1 || '';
    dto.lastname2 = persona?.lastname2 || '';

    return dto;
  }

}
